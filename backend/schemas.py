from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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


class CartItemCreate(BaseModel):
    product_id: int = Field(ge=1)
    quantity: int = Field(default=1, ge=1)


class CartLineOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductOut


class CartOut(BaseModel):
    items: list[CartLineOut]
    subtotal: Decimal


class CheckoutResponse(BaseModel):
    order_id: int
    status: str
    total: Decimal
    payment_reference: str | None
    message: str


class OrderItemOut(BaseModel):
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderOut(BaseModel):
    id: int
    status: str
    total: Decimal
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


class AdminOrderSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    total: Decimal
    created_at: datetime
    user_email: str
    user_full_name: str | None


class AdminOrderDetailOut(BaseModel):
    id: int
    status: str
    total: Decimal
    created_at: datetime
    payment_reference: str | None
    user_email: str
    user_full_name: str | None
    items: list[OrderItemOut]


class AdminOrderListOut(BaseModel):
    items: list[AdminOrderSummaryOut]
    total: int


class AdminOrderStatusUpdate(BaseModel):
    status: Literal["pending", "processing", "shipped", "delivered", "cancelled"]


class AdminStatsOut(BaseModel):
    product_count: int
    order_count: int
    low_stock_count: int
    out_of_stock_count: int
    orders_by_status: dict[str, int]
    total_sales: Decimal
    total_users: int

