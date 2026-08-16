from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Bumped on logout / password change to revoke every outstanding JWT for this account.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # Email verification via OTP.
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    otp_code: Mapped[str | None] = mapped_column(String(255), nullable=True)  # bcrypt hash of OTP
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cart_items: Mapped[list[CartItem]] = relationship(back_populates="user", cascade="all, delete-orphan")
    orders: Mapped[list[Order]] = relationship(back_populates="user")


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    front_view: Mapped[str | None] = mapped_column(String(512), nullable=True)
    side_view: Mapped[str | None] = mapped_column(String(512), nullable=True)
    lifestyle_images: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail: Mapped[str | None] = mapped_column(String(512), nullable=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    # Data-driven specifications (were hardcoded in the UI).
    material: Mapped[str | None] = mapped_column(String(128), nullable=True)
    lens_width_mm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bridge_mm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    temple_mm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lens_features: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # JSON array of {"name": str, "hex": str}. Empty/None => product has no color options.
    colors: Mapped[str | None] = mapped_column(Text, nullable=True)


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    quantity: Mapped[int] = mapped_column(default=1)
    color: Mapped[str | None] = mapped_column(String(64), nullable=True)

    user: Mapped[User] = relationship(back_populates="cart_items")
    product: Mapped[Product] = relationship()


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="processing")
    # Financial breakdown. `total` = subtotal + tax + shipping_fee - discount.
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    tax: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    shipping_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    discount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    coupon_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Shipping / contact details captured at checkout.
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ship_full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ship_address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ship_city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ship_state: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ship_zip: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tracking_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user: Mapped[User] = relationship(back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    quantity: Mapped[int] = mapped_column(nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255))
    color: Mapped[str | None] = mapped_column(String(64), nullable=True)

    order: Mapped[Order] = relationship(back_populates="items")


class Review(Base):
    __tablename__ = "reviews"
    # One review per customer per product; POST upserts the caller's existing review.
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_review_user_product"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Derived at write time by sentiment.classify: "positive" | "neutral" | "negative".
    sentiment: Mapped[str] = mapped_column(String(16), nullable=False, default="neutral")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user: Mapped[User] = relationship()
    product: Mapped[Product] = relationship()


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped[Product] = relationship()
