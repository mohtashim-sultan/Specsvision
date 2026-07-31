import json
import os
import uuid
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, UploadFile, File
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload

from config import settings
from deps import get_current_admin, get_current_user, get_current_user_optional, get_db
from models import Admin, CartItem, Order, OrderItem, Product, Review, User, WishlistItem
from order_status import VALID_ORDER_STATUSES, can_transition
from rate_limit import enforce_login_rate_limit
from schemas import (
    AdminCreate,
    AdminLogin,
    AdminOrderDetailOut,
    AdminOrderListOut,
    AdminOrderStatusUpdate,
    AdminOrderSummaryOut,
    AdminOut,
    AdminAnalyticsOut,
    AdminProductCreate,
    AdminProductUpdate,
    AdminStatsOut,
    AdminUserListOut,
    AdminUserOut,
    CartItemCreate,
    CartLineOut,
    CartOut,
    CheckoutRequest,
    CheckoutResponse,
    OrderItemOut,
    OrderOut,
    ProductOut,
    ReviewCreate,
    ReviewListOut,
    ReviewOut,
    ReviewSummary,
    SalesPoint,
    TokenWithRole,
    TopProduct,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
    WishlistItemCreate,
    WishlistItemOut,
    WishlistOut,
)
from security import create_access_token, hash_password, verify_password
from sentiment import classify as classify_sentiment

# Static coupon table: code -> (kind, value). "percent" is a fraction of subtotal, "flat" a $ amount.
_COUPONS: dict[str, tuple[str, Decimal]] = {
    "SPECS10": ("percent", Decimal("0.10")),
    "WELCOME5": ("flat", Decimal("5.00")),
}

_CENTS = Decimal("0.01")
_ALLOWED_UPLOAD_EXTS = frozenset({".png", ".jpg", ".jpeg", ".webp", ".gif"})
_ALLOWED_UPLOAD_TYPES = frozenset(
    {"image/png", "image/jpeg", "image/webp", "image/gif"}
)

# ── 3-D try-on models ─────────────────────────────────────────────────────────
# Virtual try-on needs a glTF frame model per product (Product.front_view).
#
# Browsers are unreliable about MIME types here: a .glb only reports
# model/gltf-binary when the OS mime registry happens to know the extension, and
# otherwise arrives as application/octet-stream or an empty string. Content-type is
# therefore too weak to validate on alone, so uploads are gated on the extension plus
# a magic-number check of the actual bytes (see _validate_model_header).
_MODEL_UPLOAD_EXTS = frozenset({".glb", ".gltf"})
_MODEL_UPLOAD_TYPES = frozenset(
    {
        "model/gltf-binary",
        "model/gltf+json",
        "application/octet-stream",
        "application/json",
        "text/plain",
        "",
    }
)
# First 4 bytes of a binary glTF container, per the glTF 2.0 spec.
_GLB_MAGIC = b"glTF"


def _validate_model_header(ext: str, head: bytes) -> None:
    """Reject files whose contents don't match the 3-D model extension they claim.

    Content-type can't be trusted for .glb/.gltf (see above), so this is what actually
    stops an arbitrary binary being stored under a model extension.
    """
    if ext == ".glb":
        if not head.startswith(_GLB_MAGIC):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not a valid .glb file (missing glTF header).",
            )
    elif ext == ".gltf":
        # .gltf is a JSON document; tolerate a UTF-8 BOM and leading whitespace.
        if head.lstrip(b"\xef\xbb\xbf").lstrip()[:1] != b"{":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not a valid .gltf file (expected a JSON document).",
            )


def _money(value: Decimal) -> Decimal:
    return value.quantize(_CENTS, rounding=ROUND_HALF_UP)


def _colors_to_json(colors) -> str | None:
    """Serialize a list of ProductColor (or None) to the JSON string stored on Product.colors."""
    if not colors:
        return None
    return json.dumps([{"name": c.name, "hex": c.hex} for c in colors])


def _attach_ratings(db: Session, products: list[Product]) -> None:
    """Populate avg_rating/review_count on ORM Product instances (non-persistent attributes)."""
    ids = [p.id for p in products]
    if not ids:
        return
    rows = db.execute(
        select(Review.product_id, func.avg(Review.rating), func.count())
        .where(Review.product_id.in_(ids))
        .group_by(Review.product_id)
    ).all()
    stats = {pid: (round(float(avg), 2), int(count)) for pid, avg, count in rows}
    for product in products:
        avg, count = stats.get(product.id, (None, 0))
        product.avg_rating = avg
        product.review_count = count


def _author_name(user: User) -> str:
    if user.full_name and user.full_name.strip():
        return user.full_name.strip()
    return user.email.split("@")[0]


def _review_out(review: Review, current_user_id: int | None) -> ReviewOut:
    return ReviewOut(
        id=review.id,
        product_id=review.product_id,
        rating=review.rating,
        title=review.title,
        body=review.body,
        sentiment=review.sentiment,
        author_name=_author_name(review.user),
        is_mine=current_user_id is not None and review.user_id == current_user_id,
        created_at=review.created_at,
    )


def _resolve_discount(subtotal: Decimal, coupon_code: str | None) -> tuple[Decimal, str | None]:
    """Return (discount_amount, normalized_code). Unknown codes are rejected."""
    if not coupon_code:
        return Decimal("0.00"), None
    code = coupon_code.strip().upper()
    entry = _COUPONS.get(code)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired coupon code.")
    kind, value = entry
    discount = subtotal * value if kind == "percent" else value
    # Never discount below zero.
    discount = min(_money(discount), subtotal)
    return discount, code


def _compute_pricing(subtotal: Decimal, coupon_code: str | None) -> dict[str, Decimal | str | None]:
    subtotal = _money(subtotal)
    discount, code = _resolve_discount(subtotal, coupon_code)
    taxable = subtotal - discount
    tax = _money(taxable * settings.tax_rate)
    shipping = Decimal("0.00") if subtotal >= settings.free_shipping_threshold else _money(settings.shipping_fee)
    total = _money(taxable + tax + shipping)
    return {
        "subtotal": subtotal,
        "discount": discount,
        "coupon_code": code,
        "tax": tax,
        "shipping_fee": shipping,
        "total": total,
    }


def _restock_order(db: Session, order: Order) -> None:
    """Return each line's quantity to product stock (used on cancellation)."""
    for item in order.items:
        if item.product_id is None:
            continue
        product = db.get(Product, item.product_id)
        if product is not None:
            product.stock_quantity += item.quantity


def _admin_order_detail(order: Order) -> "AdminOrderDetailOut":
    items_out = [
        OrderItemOut(
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity,
            color=item.color,
        )
        for item in order.items
    ]
    return AdminOrderDetailOut(
        id=order.id,
        status=order.status,
        subtotal=order.subtotal,
        tax=order.tax,
        shipping_fee=order.shipping_fee,
        discount=order.discount,
        coupon_code=order.coupon_code,
        total=order.total,
        created_at=order.created_at,
        payment_reference=order.payment_reference,
        tracking_number=order.tracking_number,
        contact_email=order.contact_email,
        contact_phone=order.contact_phone,
        ship_full_name=order.ship_full_name,
        ship_address=order.ship_address,
        ship_city=order.ship_city,
        ship_state=order.ship_state,
        ship_zip=order.ship_zip,
        user_email=order.user.email,
        user_full_name=order.user.full_name,
        items=items_out,
    )


def _order_out(order: Order) -> OrderOut:
    items_out = [
        OrderItemOut(
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity,
            color=item.color,
        )
        for item in order.items
    ]
    return OrderOut(
        id=order.id,
        status=order.status,
        subtotal=order.subtotal,
        tax=order.tax,
        shipping_fee=order.shipping_fee,
        discount=order.discount,
        coupon_code=order.coupon_code,
        total=order.total,
        payment_reference=order.payment_reference,
        tracking_number=order.tracking_number,
        ship_full_name=order.ship_full_name,
        ship_address=order.ship_address,
        ship_city=order.ship_city,
        ship_state=order.ship_state,
        ship_zip=order.ship_zip,
        created_at=order.created_at,
        items=items_out,
    )

auth_router = APIRouter(prefix="/auth", tags=["auth"])
products_router = APIRouter(prefix="/products", tags=["products"])
cart_router = APIRouter(prefix="/cart", tags=["cart"])
checkout_router = APIRouter(prefix="/checkout", tags=["checkout"])
wishlist_router = APIRouter(prefix="/wishlist", tags=["wishlist"])
admin_auth_router = APIRouter()
admin_products_router = APIRouter()
admin_orders_router = APIRouter()
admin_stats_router = APIRouter()
admin_users_router = APIRouter()
admin_analytics_router = APIRouter()


@auth_router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(body: UserCreate, db: Session = Depends(get_db)) -> User:
    email = body.email.lower()
    if db.scalar(select(Admin).where(Admin.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is used by an administrator account.",
        )
    exists = db.scalar(select(User).where(User.email == email))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@auth_router.post("/login", response_model=TokenWithRole)
def login(body: UserLogin, request: Request, db: Session = Depends(get_db)) -> TokenWithRole:
    email = body.email.lower()
    enforce_login_rate_limit(request, email)
    admin = db.scalar(select(Admin).where(Admin.email == email))
    user = db.scalar(select(User).where(User.email == email))
    if admin is not None and user is not None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account data conflict: contact support.",
        )
    if admin is None and user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account does not exist.")
    if admin is not None:
        if not verify_password(body.password, admin.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
        token = create_access_token(admin.id, role="admin", token_version=admin.token_version)
        return TokenWithRole(access_token=token, role="admin")
    assert user is not None
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
    token = create_access_token(user.id, role="user", token_version=user.token_version)
    return TokenWithRole(access_token=token, role="user")


@auth_router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)) -> User:
    return current


@auth_router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    """Revoke every outstanding token for this account by bumping its token_version."""
    current.token_version += 1
    db.commit()


@auth_router.post("/refresh", response_model=TokenWithRole)
def refresh(current: User = Depends(get_current_user)) -> TokenWithRole:
    token = create_access_token(current.id, role="user", token_version=current.token_version)
    return TokenWithRole(access_token=token, role="user")


@auth_router.put("/me", response_model=UserOut)
def update_profile(
    body: UserUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if body.email is not None:
        email = body.email.lower()
        if email != current.email:
            if db.scalar(select(User).where(User.email == email)):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
            if db.scalar(select(Admin).where(Admin.email == email)):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email is used by an administrator account.",
                )
            current.email = email

    if body.full_name is not None:
        current.full_name = body.full_name.strip()

    if body.password is not None:
        current.hashed_password = hash_password(body.password)

    db.commit()
    db.refresh(current)
    return current


@products_router.get("", response_model=list[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, description="Search product name/description"),
    category: str | None = Query(default=None),
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    sort: str = Query(default="id", pattern="^(id|price_asc|price_desc|name)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> list[Product]:
    stmt = select(Product).where(Product.stock_quantity > 0)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(Product.name.ilike(like) | Product.description.ilike(like))
    if category:
        stmt = stmt.where(Product.category == category.strip())
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if sort == "price_asc":
        stmt = stmt.order_by(Product.price.asc())
    elif sort == "price_desc":
        stmt = stmt.order_by(Product.price.desc())
    elif sort == "name":
        stmt = stmt.order_by(Product.name.asc())
    else:
        stmt = stmt.order_by(Product.id)
    stmt = stmt.offset(offset).limit(limit)
    products = list(db.scalars(stmt).all())
    _attach_ratings(db, products)
    return products


@products_router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    _attach_ratings(db, [product])
    return product


@products_router.get("/{product_id}/reviews", response_model=ReviewListOut)
def list_reviews(
    product_id: int,
    db: Session = Depends(get_db),
    current: User | None = Depends(get_current_user_optional),
) -> ReviewListOut:
    if db.get(Product, product_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    reviews = list(
        db.scalars(
            select(Review)
            .where(Review.product_id == product_id)
            .options(joinedload(Review.user))
            .order_by(Review.id.desc())
        )
        .unique()
        .all()
    )
    rating_breakdown = {star: 0 for star in range(1, 6)}
    sentiment_breakdown = {"positive": 0, "neutral": 0, "negative": 0}
    total = 0
    for r in reviews:
        rating_breakdown[r.rating] = rating_breakdown.get(r.rating, 0) + 1
        sentiment_breakdown[r.sentiment] = sentiment_breakdown.get(r.sentiment, 0) + 1
        total += r.rating
    avg = round(total / len(reviews), 2) if reviews else None
    current_id = current.id if current else None
    items = [_review_out(r, current_id) for r in reviews]
    my_review = next((item for item in items if item.is_mine), None)
    return ReviewListOut(
        summary=ReviewSummary(
            review_count=len(reviews),
            avg_rating=avg,
            rating_breakdown=rating_breakdown,
            sentiment_breakdown=sentiment_breakdown,
        ),
        items=items,
        my_review=my_review,
    )


@products_router.post("/{product_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def upsert_review(
    product_id: int,
    body: ReviewCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReviewOut:
    if db.get(Product, product_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    sentiment = classify_sentiment(body.rating, body.title, body.body)
    existing = db.scalar(
        select(Review).where(Review.product_id == product_id, Review.user_id == current.id)
    )
    if existing is not None:
        existing.rating = body.rating
        existing.title = body.title
        existing.body = body.body
        existing.sentiment = sentiment
        review = existing
    else:
        review = Review(
            product_id=product_id,
            user_id=current.id,
            rating=body.rating,
            title=body.title,
            body=body.body,
            sentiment=sentiment,
        )
        db.add(review)
    db.commit()
    db.refresh(review)
    # Ensure the relationship is loaded for author name.
    db.refresh(review, attribute_names=["user"])
    return _review_out(review, current.id)


@products_router.delete("/{product_id}/reviews", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    product_id: int,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    review = db.scalar(
        select(Review).where(Review.product_id == product_id, Review.user_id == current.id)
    )
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have no review for this product")
    db.delete(review)
    db.commit()


def _cart_lines(db: Session, user_id: int) -> list[CartItem]:
    return list(
        db.scalars(
            select(CartItem)
            .where(CartItem.user_id == user_id)
            .options(joinedload(CartItem.product))
            .order_by(CartItem.id)
        )
        .unique()
        .all()
    )


def _subtotal(lines: list[CartItem]) -> Decimal:
    total = Decimal("0")
    for line in lines:
        total += line.product.price * line.quantity
    return total


@cart_router.get("", response_model=CartOut)
def get_cart(current: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartOut:
    lines = _cart_lines(db, current.id)
    out_lines = [
        CartLineOut(
            id=line.id,
            product_id=line.product_id,
            quantity=line.quantity,
            color=line.color,
            product=ProductOut.model_validate(line.product),
        )
        for line in lines
    ]
    return CartOut(items=out_lines, subtotal=_subtotal(lines))


@cart_router.post("/items", response_model=CartOut)
def add_to_cart(
    body: CartItemCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartOut:
    product = db.get(Product, body.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing = db.scalar(
        select(CartItem).where(CartItem.user_id == current.id, CartItem.product_id == body.product_id)
    )
    new_total_qty = (existing.quantity if existing else 0) + body.quantity
    if product.stock_quantity < new_total_qty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough stock available for this quantity",
        )

    if existing:
        existing.quantity = new_total_qty
        if body.color is not None:
            existing.color = body.color
    else:
        db.add(CartItem(user_id=current.id, product_id=body.product_id, quantity=body.quantity, color=body.color))
    db.commit()

    lines = _cart_lines(db, current.id)
    out_lines = [
        CartLineOut(
            id=line.id,
            product_id=line.product_id,
            quantity=line.quantity,
            color=line.color,
            product=ProductOut.model_validate(line.product),
        )
        for line in lines
    ]
    return CartOut(items=out_lines, subtotal=_subtotal(lines))


@cart_router.delete("/items/{product_id}", response_model=CartOut)
def remove_from_cart(
    product_id: int,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartOut:
    row = db.scalar(
        select(CartItem).where(CartItem.user_id == current.id, CartItem.product_id == product_id)
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart line not found")
    db.delete(row)
    db.commit()

    lines = _cart_lines(db, current.id)
    out_lines = [
        CartLineOut(
            id=line.id,
            product_id=line.product_id,
            quantity=line.quantity,
            color=line.color,
            product=ProductOut.model_validate(line.product),
        )
        for line in lines
    ]
    return CartOut(items=out_lines, subtotal=_subtotal(lines))


def _validate_card_not_expired(card_expiry: str) -> None:
    """card_expiry is 'MM/YY'. Reject a past month (simulated gateway pre-check)."""
    try:
        month_str, year_str = card_expiry.split("/")
        month = int(month_str)
        year = 2000 + int(year_str)
    except (ValueError, IndexError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid card expiry.")
    if not 1 <= month <= 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid card expiry month.")
    now = datetime.now(timezone.utc)
    if (year, month) < (now.year, now.month):
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Card has expired.")


@checkout_router.post("", response_model=CheckoutResponse)
def checkout(
    body: CheckoutRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    lines = list(
        db.scalars(
            select(CartItem).where(CartItem.user_id == current.id).options(joinedload(CartItem.product))
        )
        .unique()
        .all()
    )
    if not lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    # Lock the product rows for the duration of the transaction so two concurrent checkouts
    # cannot both pass the stock check and oversell. (No-op on SQLite, enforced on Postgres.)
    product_ids = [line.product_id for line in lines if line.product_id is not None]
    locked = {
        p.id: p
        for p in db.scalars(select(Product).where(Product.id.in_(product_ids)).with_for_update()).all()
    }

    subtotal = Decimal("0")
    order_items: list[OrderItem] = []
    for line in lines:
        product = locked.get(line.product_id) if line.product_id is not None else None
        if product is None:
            continue
        if product.stock_quantity < line.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for: {product.name}",
            )
        subtotal += product.price * line.quantity
        order_items.append(
            OrderItem(
                product_id=line.product_id,
                quantity=line.quantity,
                unit_price=product.price,
                product_name=product.name,
                color=line.color,
            )
        )

    if not order_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid cart lines")

    pricing = _compute_pricing(subtotal, body.coupon_code)

    # --- Simulated payment gateway ---------------------------------------------------
    _validate_card_not_expired(body.payment.card_expiry)
    if not body.payment.simulate_success:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your transaction was declined by the bank.",
        )
    last4 = body.payment.card_number[-4:]
    payment_reference = f"sim-{uuid.uuid4().hex[:12]}-{last4}"
    # ---------------------------------------------------------------------------------

    ship = body.shipping
    order = Order(
        user_id=current.id,
        status="processing",
        subtotal=pricing["subtotal"],
        tax=pricing["tax"],
        shipping_fee=pricing["shipping_fee"],
        discount=pricing["discount"],
        coupon_code=pricing["coupon_code"],
        total=pricing["total"],
        payment_reference=payment_reference,
        contact_email=ship.email,
        contact_phone=ship.phone,
        ship_full_name=ship.full_name,
        ship_address=ship.address,
        ship_city=ship.city,
        ship_state=ship.state,
        ship_zip=ship.zip_code,
    )
    db.add(order)
    db.flush()
    for item in order_items:
        item.order_id = order.id
        db.add(item)

    for line in lines:
        product = locked.get(line.product_id) if line.product_id is not None else None
        if product is not None:
            product.stock_quantity -= line.quantity

    db.execute(delete(CartItem).where(CartItem.user_id == current.id))
    db.commit()
    db.refresh(order)

    return CheckoutResponse(
        order_id=order.id,
        status=order.status,
        subtotal=order.subtotal,
        tax=order.tax,
        shipping_fee=order.shipping_fee,
        discount=order.discount,
        total=order.total,
        payment_reference=order.payment_reference,
        message="Payment approved (simulated gateway). Order placed successfully.",
    )


@checkout_router.get("/orders", response_model=list[OrderOut])
def list_user_orders(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OrderOut]:
    orders = list(
        db.scalars(
            select(Order)
            .where(Order.user_id == current.id)
            .options(joinedload(Order.items))
            .order_by(Order.id.desc())
        )
        .unique()
        .all()
    )
    return [_order_out(o) for o in orders]


def _load_user_order(db: Session, order_id: int, user_id: int) -> Order:
    order = (
        db.scalars(
            select(Order)
            .where(Order.id == order_id, Order.user_id == user_id)
            .options(joinedload(Order.items))
        )
        .unique()
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@checkout_router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, current: User = Depends(get_current_user), db: Session = Depends(get_db)) -> OrderOut:
    return _order_out(_load_user_order(db, order_id, current.id))


@checkout_router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, current: User = Depends(get_current_user), db: Session = Depends(get_db)) -> OrderOut:
    """Customer-initiated cancellation. Only allowed before the order ships; restocks inventory."""
    order = _load_user_order(db, order_id, current.id)
    if order.status not in ("pending", "processing"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An order that is '{order.status}' can no longer be cancelled.",
        )
    _restock_order(db, order)
    order.status = "cancelled"
    db.commit()
    db.refresh(order)
    return _order_out(order)


@admin_auth_router.post("/setup", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
def setup_first_admin(body: AdminCreate, db: Session = Depends(get_db)) -> Admin:
    if db.scalar(select(Admin).limit(1)) is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Initial admin already exists. Sign in, or use POST /api/admin/auth/admins with an admin token.",
        )
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered as a customer.",
        )
    admin = Admin(
        email=email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@admin_auth_router.post("/admins", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
def create_admin(
    body: AdminCreate,
    db: Session = Depends(get_db),
    _current: Admin = Depends(get_current_admin),
) -> Admin:
    email = body.email.lower()
    if db.scalar(select(Admin).where(Admin.email == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered as a customer.",
        )
    admin = Admin(
        email=email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@admin_auth_router.post("/login", response_model=TokenWithRole)
def admin_login(body: AdminLogin, request: Request, db: Session = Depends(get_db)) -> TokenWithRole:
    email = body.email.lower()
    enforce_login_rate_limit(request, f"admin:{email}")
    admin = db.scalar(select(Admin).where(Admin.email == email))
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account does not exist.")
    if not verify_password(body.password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
    token = create_access_token(admin.id, role="admin", token_version=admin.token_version)
    return TokenWithRole(access_token=token, role="admin")


@admin_auth_router.get("/me", response_model=AdminOut)
def admin_me(current: Admin = Depends(get_current_admin)) -> Admin:
    return current


@admin_auth_router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def admin_logout(current: Admin = Depends(get_current_admin), db: Session = Depends(get_db)) -> None:
    current.token_version += 1
    db.commit()


@admin_auth_router.post("/refresh", response_model=TokenWithRole)
def admin_refresh(current: Admin = Depends(get_current_admin)) -> TokenWithRole:
    token = create_access_token(current.id, role="admin", token_version=current.token_version)
    return TokenWithRole(access_token=token, role="admin")


@admin_products_router.get("", response_model=list[ProductOut])
def list_products_admin(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> list[Product]:
    return list(db.scalars(select(Product).order_by(Product.id)).all())


@admin_products_router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    body: AdminProductCreate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Product:
    sku = body.sku.strip()
    if db.scalar(select(Product).where(Product.sku == sku)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    product = Product(
        sku=sku,
        name=body.name.strip(),
        description=body.description,
        price=body.price,
        image_url=body.image_url,
        front_view=body.front_view,
        side_view=body.side_view,
        lifestyle_images=body.lifestyle_images,
        thumbnail=body.thumbnail,
        stock_quantity=body.stock_quantity,
        category=body.category.strip() if body.category else None,
        material=body.material,
        lens_width_mm=body.lens_width_mm,
        bridge_mm=body.bridge_mm,
        temple_mm=body.temple_mm,
        lens_features=body.lens_features,
        colors=_colors_to_json(body.colors),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    _attach_ratings(db, [product])
    return product


@admin_products_router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    body: AdminProductUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    if "sku" in data and data["sku"] is not None:
        data["sku"] = data["sku"].strip()
        taken = db.scalar(select(Product).where(Product.sku == data["sku"], Product.id != product_id))
        if taken:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already in use")
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()
    if "category" in data and data["category"] is not None:
        data["category"] = data["category"].strip() or None
    if "colors" in data:
        # model_dump gives list[dict] (or None); persist as a JSON string.
        data["colors"] = json.dumps(data["colors"]) if data["colors"] else None
    for key, value in data.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    _attach_ratings(db, [product])
    return product


@admin_products_router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> None:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(product)
    db.commit()


@admin_orders_router.get("", response_model=AdminOrderListOut)
def list_orders_admin(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
) -> AdminOrderListOut:
    count_stmt = select(func.count()).select_from(Order)
    stmt = select(Order).options(joinedload(Order.user)).order_by(Order.id.desc())
    if status is not None and status in VALID_ORDER_STATUSES:
        count_stmt = count_stmt.where(Order.status == status)
        stmt = stmt.where(Order.status == status)
    total = int(db.scalar(count_stmt) or 0)
    rows = list(db.scalars(stmt.offset(offset).limit(limit)).unique().all())
    items = [
        AdminOrderSummaryOut(
            id=o.id,
            status=o.status,
            total=o.total,
            created_at=o.created_at,
            user_email=o.user.email,
            user_full_name=o.user.full_name,
        )
        for o in rows
    ]
    return AdminOrderListOut(items=items, total=total)


@admin_orders_router.get("/{order_id}", response_model=AdminOrderDetailOut)
def get_order_admin(
    order_id: int,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> AdminOrderDetailOut:
    order = (
        db.scalars(
            select(Order)
            .where(Order.id == order_id)
            .options(joinedload(Order.user), joinedload(Order.items))
        )
        .unique()
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _admin_order_detail(order)


def _load_admin_order(db: Session, order_id: int) -> Order:
    order = (
        db.scalars(
            select(Order)
            .where(Order.id == order_id)
            .options(joinedload(Order.user), joinedload(Order.items))
        )
        .unique()
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@admin_orders_router.patch("/{order_id}", response_model=AdminOrderDetailOut)
def patch_order_status(
    order_id: int,
    body: AdminOrderStatusUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> AdminOrderDetailOut:
    order = _load_admin_order(db, order_id)
    if order.status == body.status:
        # No status change; still allow attaching/updating a tracking number.
        if body.tracking_number is not None:
            order.tracking_number = body.tracking_number.strip() or None
            db.commit()
            db.refresh(order)
        return _admin_order_detail(order)
    if not can_transition(order.status, body.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status from {order.status!r} to {body.status!r}.",
        )
    # Returning stock when an order is cancelled (was silently lost before).
    if body.status == "cancelled":
        _restock_order(db, order)
    order.status = body.status
    if body.tracking_number is not None:
        order.tracking_number = body.tracking_number.strip() or None
    db.commit()
    db.refresh(order)
    return _admin_order_detail(_load_admin_order(db, order_id))


@admin_stats_router.get("", response_model=AdminStatsOut)
def admin_dashboard_stats(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> AdminStatsOut:
    product_count = int(db.scalar(select(func.count()).select_from(Product)) or 0)
    order_count = int(db.scalar(select(func.count()).select_from(Order)) or 0)
    low_stock_count = int(
        db.scalar(
            select(func.count())
            .select_from(Product)
            .where(Product.stock_quantity > 0, Product.stock_quantity < 10)
        )
        or 0
    )
    out_of_stock_count = int(
        db.scalar(select(func.count()).select_from(Product).where(Product.stock_quantity == 0)) or 0
    )
    orders_by_status: dict[str, int] = {}
    for s in sorted(VALID_ORDER_STATUSES):
        n = int(db.scalar(select(func.count()).select_from(Order).where(Order.status == s)) or 0)
        if n:
            orders_by_status[s] = n
    other = int(
        db.scalar(
            select(func.count()).select_from(Order).where(~Order.status.in_(tuple(VALID_ORDER_STATUSES))))
        or 0
    )
    if other:
        orders_by_status["other"] = other

    total_sales = db.scalar(select(func.sum(Order.total))) or Decimal("0.00")
    total_users = int(db.scalar(select(func.count()).select_from(User)) or 0)

    return AdminStatsOut(
        product_count=product_count,
        order_count=order_count,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        orders_by_status=orders_by_status,
        total_sales=total_sales,
        total_users=total_users,
    )


# ── Wishlist (customer) ──────────────────────────────────────────────────────────
def _wishlist_out(db: Session, user_id: int) -> WishlistOut:
    rows = list(
        db.scalars(
            select(WishlistItem)
            .where(WishlistItem.user_id == user_id)
            .options(joinedload(WishlistItem.product))
            .order_by(WishlistItem.id.desc())
        )
        .unique()
        .all()
    )
    products = [r.product for r in rows if r.product is not None]
    _attach_ratings(db, products)
    return WishlistOut(
        items=[
            WishlistItemOut(id=r.id, product=ProductOut.model_validate(r.product), created_at=r.created_at)
            for r in rows
            if r.product is not None
        ]
    )


@wishlist_router.get("", response_model=WishlistOut)
def get_wishlist(current: User = Depends(get_current_user), db: Session = Depends(get_db)) -> WishlistOut:
    return _wishlist_out(db, current.id)


@wishlist_router.post("/items", response_model=WishlistOut, status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    body: WishlistItemCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WishlistOut:
    if db.get(Product, body.product_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    exists = db.scalar(
        select(WishlistItem).where(
            WishlistItem.user_id == current.id, WishlistItem.product_id == body.product_id
        )
    )
    if exists is None:
        db.add(WishlistItem(user_id=current.id, product_id=body.product_id))
        db.commit()
    return _wishlist_out(db, current.id)


@wishlist_router.delete("/items/{product_id}", response_model=WishlistOut)
def remove_from_wishlist(
    product_id: int,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WishlistOut:
    row = db.scalar(
        select(WishlistItem).where(
            WishlistItem.user_id == current.id, WishlistItem.product_id == product_id
        )
    )
    if row is not None:
        db.delete(row)
        db.commit()
    return _wishlist_out(db, current.id)


# ── Admin: user management ───────────────────────────────────────────────────────
@admin_users_router.get("", response_model=AdminUserListOut)
def list_users_admin(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    q: str | None = Query(default=None, description="Search email or full name"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> AdminUserListOut:
    base = select(User)
    count_stmt = select(func.count()).select_from(User)
    if q:
        like = f"%{q.strip()}%"
        cond = User.email.ilike(like) | User.full_name.ilike(like)
        base = base.where(cond)
        count_stmt = count_stmt.where(cond)
    total = int(db.scalar(count_stmt) or 0)
    users = list(db.scalars(base.order_by(User.id.desc()).offset(offset).limit(limit)).all())

    items: list[AdminUserOut] = []
    for u in users:
        order_count = int(db.scalar(select(func.count()).select_from(Order).where(Order.user_id == u.id)) or 0)
        total_spent = db.scalar(
            select(func.sum(Order.total)).where(
                Order.user_id == u.id, Order.status != "cancelled"
            )
        ) or Decimal("0.00")
        review_count = int(db.scalar(select(func.count()).select_from(Review).where(Review.user_id == u.id)) or 0)
        items.append(
            AdminUserOut(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                created_at=u.created_at,
                order_count=order_count,
                total_spent=total_spent,
                review_count=review_count,
            )
        )
    return AdminUserListOut(items=items, total=total)


# ── Admin: analytics ─────────────────────────────────────────────────────────────
@admin_analytics_router.get("", response_model=AdminAnalyticsOut)
def admin_analytics(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
    days: int = Query(default=30, ge=1, le=365),
) -> AdminAnalyticsOut:
    # Sales grouped by calendar day (SQLite `date()` on the stored timestamp).
    day_expr = func.date(Order.created_at)
    sales_rows = db.execute(
        select(day_expr.label("d"), func.sum(Order.total), func.count())
        .where(Order.status != "cancelled")
        .group_by("d")
        .order_by("d")
    ).all()
    sales_by_day = [
        SalesPoint(date=str(d), revenue=rev or Decimal("0.00"), orders=int(cnt or 0))
        for d, rev, cnt in sales_rows
        if d is not None
    ][-days:]

    # Top products by units sold (excludes cancelled orders).
    top_rows = db.execute(
        select(
            OrderItem.product_id,
            OrderItem.product_name,
            func.sum(OrderItem.quantity),
            func.sum(OrderItem.unit_price * OrderItem.quantity),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status != "cancelled")
        .group_by(OrderItem.product_id, OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
    ).all()
    top_products = [
        TopProduct(product_id=pid, name=name, units_sold=int(qty or 0), revenue=rev or Decimal("0.00"))
        for pid, name, qty, rev in top_rows
    ]

    sentiment_breakdown = {"positive": 0, "neutral": 0, "negative": 0}
    for s, cnt in db.execute(select(Review.sentiment, func.count()).group_by(Review.sentiment)).all():
        sentiment_breakdown[s] = int(cnt or 0)

    rating_distribution = {star: 0 for star in range(1, 6)}
    for star, cnt in db.execute(select(Review.rating, func.count()).group_by(Review.rating)).all():
        if star in rating_distribution:
            rating_distribution[int(star)] = int(cnt or 0)

    revenue_total = db.scalar(select(func.sum(Order.total)).where(Order.status != "cancelled")) or Decimal("0.00")
    orders_total = int(db.scalar(select(func.count()).select_from(Order).where(Order.status != "cancelled")) or 0)

    return AdminAnalyticsOut(
        sales_by_day=sales_by_day,
        top_products=top_products,
        sentiment_breakdown=sentiment_breakdown,
        rating_distribution=rating_distribution,
        revenue_total=revenue_total,
        orders_total=orders_total,
    )


admin_router = APIRouter(prefix="/admin")


@admin_router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    _admin: Admin = Depends(get_current_admin),
) -> dict:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided.")
    ext = os.path.splitext(file.filename)[1].lower()
    is_model = ext in _MODEL_UPLOAD_EXTS

    if ext not in _ALLOWED_UPLOAD_EXTS and not is_model:
        allowed = sorted(_ALLOWED_UPLOAD_EXTS | _MODEL_UPLOAD_EXTS)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed)}",
        )

    if is_model:
        if (file.content_type or "") not in _MODEL_UPLOAD_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content-type is not an accepted 3-D model type.",
            )
        max_bytes = settings.max_model_upload_bytes
    else:
        if file.content_type not in _ALLOWED_UPLOAD_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content-type is not an accepted image type.",
            )
        max_bytes = settings.max_upload_bytes

    # Enforce the size limit while streaming so a huge upload can't exhaust memory/disk.
    os.makedirs("uploads", exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join("uploads", filename)
    written = 0
    checked_header = False
    try:
        with open(filepath, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):
                # Validate the real bytes before committing the rest of the stream —
                # the extension alone can't be trusted for models (see _MODEL_UPLOAD_TYPES).
                if is_model and not checked_header:
                    _validate_model_header(ext, chunk[:64])
                    checked_header = True
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds the {max_bytes // (1024 * 1024)} MB upload limit.",
                    )
                buffer.write(chunk)
        if is_model and not checked_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded model file is empty."
            )
    except HTTPException:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise
    except OSError:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store upload.")
    return {"url": f"/uploads/{filename}"}
admin_router.include_router(admin_auth_router, prefix="/auth", tags=["admin-auth"])
admin_router.include_router(admin_products_router, prefix="/products", tags=["admin-products"])
admin_router.include_router(admin_orders_router, prefix="/orders", tags=["admin-orders"])
admin_router.include_router(admin_stats_router, prefix="/stats", tags=["admin-stats"])
admin_router.include_router(admin_users_router, prefix="/users", tags=["admin-users"])
admin_router.include_router(admin_analytics_router, prefix="/analytics", tags=["admin-analytics"])
