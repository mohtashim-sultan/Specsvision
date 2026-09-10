import json
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    full_name: str | None = None



class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenWithRole(Token):
    role: Literal["user", "admin"]


class ProductColor(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    hex: str = Field(pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    description: str | None
    price: Decimal
    image_url: str | None
    front_view: str | None = None
    side_view: str | None = None
    lifestyle_images: str | None = None
    thumbnail: str | None = None
    stock_quantity: int
    category: str | None = None
    material: str | None = None
    lens_width_mm: int | None = None
    bridge_mm: int | None = None
    temple_mm: int | None = None
    lens_features: str | None = None
    colors: list[ProductColor] = []
    # Aggregated from reviews; populated by the product endpoints (None when no reviews yet).
    avg_rating: float | None = None
    review_count: int = 0

    @field_validator("colors", mode="before")
    @classmethod
    def _parse_colors(cls, v: object) -> object:
        # The ORM stores colors as a JSON string; accept str, list, or None.
        if v is None or v == "":
            return []
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except (ValueError, TypeError):
                return []
        return v


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=255)
    body: str | None = Field(default=None, max_length=4000)


class ReviewOut(BaseModel):
    id: int
    product_id: int
    rating: int
    title: str | None
    body: str | None
    sentiment: str
    author_name: str
    is_mine: bool = False
    created_at: datetime


class ReviewSummary(BaseModel):
    review_count: int
    avg_rating: float | None
    rating_breakdown: dict[int, int]      # stars (1-5) -> count
    sentiment_breakdown: dict[str, int]   # positive/neutral/negative -> count


class ReviewListOut(BaseModel):
    summary: ReviewSummary
    items: list[ReviewOut]
    my_review: ReviewOut | None = None


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    offset: int
    limit: int


class CartItemCreate(BaseModel):
    product_id: int = Field(ge=1)
    quantity: int = Field(default=1, ge=1)
    color: str | None = Field(default=None, max_length=64)


class CartLineOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    color: str | None = None
    product: ProductOut


class CartOut(BaseModel):
    items: list[CartLineOut]
    subtotal: Decimal


class ShippingAddress(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    address: str = Field(min_length=1, max_length=512)
    city: str = Field(min_length=1, max_length=128)
    state: str = Field(min_length=1, max_length=128)
    zip_code: str = Field(min_length=3, max_length=32)
    email: EmailStr
    phone: str = Field(min_length=3, max_length=64)


class CreatePaymentIntentRequest(BaseModel):
    coupon_code: str | None = Field(default=None, max_length=64)


class CreatePaymentIntentResponse(BaseModel):
    client_secret: str
    amount: int  # in cents


class CheckoutRequest(BaseModel):
    shipping: ShippingAddress
    payment_intent_id: str = Field(min_length=1)
    coupon_code: str | None = Field(default=None, max_length=64)


class CheckoutResponse(BaseModel):
    order_id: int
    status: str
    subtotal: Decimal
    tax: Decimal
    shipping_fee: Decimal
    discount: Decimal
    total: Decimal
    payment_reference: str | None
    message: str


class OrderItemOut(BaseModel):
    product_id: int | None = None
    product_name: str
    product_sku: str | None = None
    product_image: str | None = None
    current_stock: int | None = None
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    color: str | None = None



class OrderOut(BaseModel):
    id: int
    status: str
    subtotal: Decimal | None = None
    tax: Decimal | None = None
    shipping_fee: Decimal | None = None
    discount: Decimal | None = None
    coupon_code: str | None = None
    total: Decimal
    payment_reference: str | None = None
    tracking_number: str | None = None
    ship_full_name: str | None = None
    ship_address: str | None = None
    ship_city: str | None = None
    ship_state: str | None = None
    ship_zip: str | None = None
    created_at: datetime
    items: list[OrderItemOut]


class AdminCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    created_at: datetime


class AdminProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(ge=0)
    image_url: str | None = Field(default=None, max_length=512)
    front_view: str | None = Field(default=None, max_length=512)
    side_view: str | None = Field(default=None, max_length=512)
    lifestyle_images: str | None = Field(default=None)
    thumbnail: str | None = Field(default=None, max_length=512)
    stock_quantity: int = Field(ge=0, default=0)
    category: str | None = Field(default=None, max_length=64)
    material: str | None = Field(default=None, max_length=128)
    lens_width_mm: int | None = Field(default=None, ge=0, le=200)
    bridge_mm: int | None = Field(default=None, ge=0, le=100)
    temple_mm: int | None = Field(default=None, ge=0, le=300)
    lens_features: str | None = Field(default=None, max_length=255)
    colors: list[ProductColor] | None = None


class AdminProductUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=1, max_length=64)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None, max_length=512)
    front_view: str | None = Field(default=None, max_length=512)
    side_view: str | None = Field(default=None, max_length=512)
    lifestyle_images: str | None = Field(default=None)
    thumbnail: str | None = Field(default=None, max_length=512)
    stock_quantity: int | None = Field(default=None, ge=0)
    category: str | None = Field(default=None, max_length=64)
    material: str | None = Field(default=None, max_length=128)
    lens_width_mm: int | None = Field(default=None, ge=0, le=200)
    bridge_mm: int | None = Field(default=None, ge=0, le=100)
    temple_mm: int | None = Field(default=None, ge=0, le=300)
    lens_features: str | None = Field(default=None, max_length=255)
    colors: list[ProductColor] | None = None


class AdminOrderSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    total: Decimal
    created_at: datetime
    user_email: str
    user_full_name: str | None
    items: list[OrderItemOut] = []


class AdminOrderDetailOut(BaseModel):
    id: int
    status: str
    subtotal: Decimal | None = None
    tax: Decimal | None = None
    shipping_fee: Decimal | None = None
    discount: Decimal | None = None
    coupon_code: str | None = None
    total: Decimal
    created_at: datetime
    payment_reference: str | None
    tracking_number: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    ship_full_name: str | None = None
    ship_address: str | None = None
    ship_city: str | None = None
    ship_state: str | None = None
    ship_zip: str | None = None
    user_email: str
    user_full_name: str | None
    items: list[OrderItemOut]


class AdminOrderListOut(BaseModel):
    items: list[AdminOrderSummaryOut]
    total: int


class AdminOrderStatusUpdate(BaseModel):
    status: Literal["pending", "processing", "shipped", "delivered", "cancelled"]
    tracking_number: str | None = Field(default=None, max_length=64)


class AdminStatsOut(BaseModel):
    product_count: int
    order_count: int
    low_stock_count: int
    out_of_stock_count: int
    orders_by_status: dict[str, int]
    total_sales: Decimal
    total_users: int


# ── Wishlist ─────────────────────────────────────────────────────────────────────
class WishlistItemCreate(BaseModel):
    product_id: int = Field(ge=1)


class WishlistItemOut(BaseModel):
    id: int
    product: ProductOut
    created_at: datetime


class WishlistOut(BaseModel):
    items: list[WishlistItemOut]


# ── Admin: users ─────────────────────────────────────────────────────────────────
class AdminUserOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    created_at: datetime
    order_count: int
    total_spent: Decimal
    review_count: int


class AdminUserListOut(BaseModel):
    items: list[AdminUserOut]
    total: int


# ── Admin: analytics ─────────────────────────────────────────────────────────────
class SalesPoint(BaseModel):
    date: str          # YYYY-MM-DD
    revenue: Decimal
    orders: int


class TopProduct(BaseModel):
    product_id: int | None
    name: str
    units_sold: int
    revenue: Decimal


class AdminAnalyticsOut(BaseModel):
    sales_by_day: list[SalesPoint]
    top_products: list[TopProduct]
    sentiment_breakdown: dict[str, int]
    rating_distribution: dict[int, int]
    revenue_total: Decimal
    orders_total: int

