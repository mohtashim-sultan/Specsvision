import os
import shutil
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload

from deps import get_current_admin, get_current_user, get_db
from models import Admin, CartItem, Order, OrderItem, Product, User
from order_status import VALID_ORDER_STATUSES, can_transition
from schemas import (
    AdminCreate,
    AdminLogin,
    AdminOrderDetailOut,
    AdminOrderListOut,
    AdminOrderStatusUpdate,
    AdminOrderSummaryOut,
    AdminOut,
    AdminProductCreate,
    AdminProductUpdate,
    AdminStatsOut,
    CartItemCreate,
    CartLineOut,
    CartOut,
    CheckoutResponse,
    OrderItemOut,
    OrderOut,
    ProductOut,
    TokenWithRole,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
)
from security import create_access_token, hash_password, verify_password

auth_router = APIRouter(prefix="/auth", tags=["auth"])
products_router = APIRouter(prefix="/products", tags=["products"])
cart_router = APIRouter(prefix="/cart", tags=["cart"])
checkout_router = APIRouter(prefix="/checkout", tags=["checkout"])
admin_auth_router = APIRouter()
admin_products_router = APIRouter()
admin_orders_router = APIRouter()
admin_stats_router = APIRouter()


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
def login(body: UserLogin, db: Session = Depends(get_db)) -> TokenWithRole:
    email = body.email.lower()
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
        token = create_access_token(admin.id, role="admin")
        return TokenWithRole(access_token=token, role="admin")
    assert user is not None
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
    token = create_access_token(user.id, role="user")
    return TokenWithRole(access_token=token, role="user")


@auth_router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)) -> User:
    return current


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
def list_products(db: Session = Depends(get_db)) -> list[Product]:
    return list(db.scalars(select(Product).where(Product.stock_quantity > 0).order_by(Product.id)).all())


@products_router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


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
    else:
        db.add(CartItem(user_id=current.id, product_id=body.product_id, quantity=body.quantity))
    db.commit()

    lines = _cart_lines(db, current.id)
    out_lines = [
        CartLineOut(
            id=line.id,
            product_id=line.product_id,
            quantity=line.quantity,
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
            product=ProductOut.model_validate(line.product),
        )
        for line in lines
    ]
    return CartOut(items=out_lines, subtotal=_subtotal(lines))


@checkout_router.post("", response_model=CheckoutResponse)
def checkout(current: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CheckoutResponse:
    lines = list(
        db.scalars(
            select(CartItem).where(CartItem.user_id == current.id).options(joinedload(CartItem.product))
        )
        .unique()
        .all()
    )
    if not lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    for line in lines:
        if line.product is None:
            continue
        if line.product.stock_quantity < line.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for: {line.product.name}",
            )

    total = Decimal("0")
    order_items: list[OrderItem] = []
    for line in lines:
        if line.product is None:
            continue
        line_total = line.product.price * line.quantity
        total += line_total
        order_items.append(
            OrderItem(
                product_id=line.product_id,
                quantity=line.quantity,
                unit_price=line.product.price,
                product_name=line.product.name,
            )
        )

    if not order_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid cart lines")

    payment_reference = f"mock-{uuid.uuid4().hex[:12]}"
    order = Order(user_id=current.id, status="processing", total=total, payment_reference=payment_reference)
    db.add(order)
    db.flush()
    for item in order_items:
        item.order_id = order.id
        db.add(item)

    for line in lines:
        if line.product is not None:
            line.product.stock_quantity -= line.quantity

    db.execute(delete(CartItem).where(CartItem.user_id == current.id))
    db.commit()
    db.refresh(order)

    return CheckoutResponse(
        order_id=order.id,
        status=order.status,
        total=order.total,
        payment_reference=order.payment_reference,
        message="Order placed. Replace mock payment with a real gateway (Stripe, etc.) for production.",
    )


@checkout_router.get("/orders", response_model=list[OrderOut])
def list_user_orders(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Order]:
    return list(
        db.scalars(
            select(Order)
            .where(Order.user_id == current.id)
            .options(joinedload(Order.items))
            .order_by(Order.id.desc())
        )
        .unique()
        .all()
    )


@checkout_router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, current: User = Depends(get_current_user), db: Session = Depends(get_db)) -> OrderOut:
    order = (
        db.scalars(
            select(Order)
            .where(Order.id == order_id, Order.user_id == current.id)
            .options(joinedload(Order.items))
        )
        .unique()
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    items_out = [
        OrderItemOut(
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity,
        )
        for item in order.items
    ]
    return OrderOut(
        id=order.id,
        status=order.status,
        total=order.total,
        created_at=order.created_at,
        items=items_out,
    )


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
def admin_login(body: AdminLogin, db: Session = Depends(get_db)) -> TokenWithRole:
    admin = db.scalar(select(Admin).where(Admin.email == body.email.lower()))
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account does not exist.")
    if not verify_password(body.password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
    token = create_access_token(admin.id, role="admin")
    return TokenWithRole(access_token=token, role="admin")


@admin_auth_router.get("/me", response_model=AdminOut)
def admin_me(current: Admin = Depends(get_current_admin)) -> Admin:
    return current


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
    )
    db.add(product)
    db.commit()
    db.refresh(product)
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
    for key, value in data.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
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
    items_out = [
        OrderItemOut(
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity,
        )
        for item in order.items
    ]
    return AdminOrderDetailOut(
        id=order.id,
        status=order.status,
        total=order.total,
        created_at=order.created_at,
        payment_reference=order.payment_reference,
        user_email=order.user.email,
        user_full_name=order.user.full_name,
        items=items_out,
    )


@admin_orders_router.patch("/{order_id}", response_model=AdminOrderDetailOut)
def patch_order_status(
    order_id: int,
    body: AdminOrderStatusUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> AdminOrderDetailOut:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status == body.status:
        order = (
            db.scalars(
                select(Order)
                .where(Order.id == order_id)
                .options(joinedload(Order.user), joinedload(Order.items))
            )
            .unique()
            .first()
        )
        assert order is not None
        items_out = [
            OrderItemOut(
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.unit_price * item.quantity,
            )
            for item in order.items
        ]
        return AdminOrderDetailOut(
            id=order.id,
            status=order.status,
            total=order.total,
            created_at=order.created_at,
            payment_reference=order.payment_reference,
            user_email=order.user.email,
            user_full_name=order.user.full_name,
            items=items_out,
        )
    if not can_transition(order.status, body.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status from {order.status!r} to {body.status!r}.",
        )
    order.status = body.status
    db.commit()
    db.refresh(order)
    order = (
        db.scalars(
            select(Order)
            .where(Order.id == order_id)
            .options(joinedload(Order.user), joinedload(Order.items))
        )
        .unique()
        .first()
    )
    assert order is not None
    items_out = [
        OrderItemOut(
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity,
        )
        for item in order.items
    ]
    return AdminOrderDetailOut(
        id=order.id,
        status=order.status,
        total=order.total,
        created_at=order.created_at,
        payment_reference=order.payment_reference,
        user_email=order.user.email,
        user_full_name=order.user.full_name,
        items=items_out,
    )


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


admin_router = APIRouter(prefix="/admin")


@admin_router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    _admin: Admin = Depends(get_current_admin),
) -> dict:
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    os.makedirs("uploads", exist_ok=True)
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/uploads/{filename}"}
admin_router.include_router(admin_auth_router, prefix="/auth", tags=["admin-auth"])
admin_router.include_router(admin_products_router, prefix="/products", tags=["admin-products"])
admin_router.include_router(admin_orders_router, prefix="/orders", tags=["admin-orders"])
admin_router.include_router(admin_stats_router, prefix="/stats", tags=["admin-stats"])
