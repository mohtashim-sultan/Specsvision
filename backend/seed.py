"""Idempotent database seeder.

Usage (from backend/, after `alembic upgrade head`):

    python seed.py

Creates the first admin (if none exists) and a small demo product catalog. Safe to re-run:
products are matched by SKU and skipped if already present.
"""
from __future__ import annotations

import os
from decimal import Decimal

from sqlalchemy import select

from db import SessionLocal
from models import Admin, Product
from security import hash_password

# Override via env when seeding a real environment.
ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@specsvision.local")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "admin12345")

PRODUCTS: list[dict] = [
    {
        "sku": "SV-AVI-001",
        "name": "Skyline Aviator",
        "description": "Timeless teardrop aviator with a lightweight metal frame.",
        "price": Decimal("89.00"),
        "category": "Aviator",
        "stock_quantity": 25,
    },
    {
        "sku": "SV-WAY-002",
        "name": "Harbor Wayfarer",
        "description": "Bold acetate wayfarer that suits most face shapes.",
        "price": Decimal("74.50"),
        "category": "Wayfarer",
        "stock_quantity": 40,
    },
    {
        "sku": "SV-RND-003",
        "name": "Lumen Round",
        "description": "Vintage-inspired round frame with a slim profile.",
        "price": Decimal("68.00"),
        "category": "Round",
        "stock_quantity": 18,
    },
    {
        "sku": "SV-CAT-004",
        "name": "Aria Cat-Eye",
        "description": "Elegant cat-eye silhouette with a modern finish.",
        "price": Decimal("95.00"),
        "category": "Cat-Eye",
        "stock_quantity": 12,
    },
    {
        "sku": "SV-REC-005",
        "name": "Meridian Rectangle",
        "description": "Sharp rectangular frame for a clean, professional look.",
        "price": Decimal("110.00"),
        "category": "Rectangle",
        "stock_quantity": 30,
    },
]


def seed() -> None:
    db = SessionLocal()
    created_products = 0
    try:
        if db.scalar(select(Admin).limit(1)) is None:
            db.add(
                Admin(
                    email=ADMIN_EMAIL.lower(),
                    hashed_password=hash_password(ADMIN_PASSWORD),
                    full_name="SpecsVision Admin",
                )
            )
            print(f"Created first admin: {ADMIN_EMAIL}")
        else:
            print("Admin already exists; skipping admin creation.")

        for data in PRODUCTS:
            if db.scalar(select(Product).where(Product.sku == data["sku"])) is not None:
                continue
            db.add(Product(**data))
            created_products += 1

        db.commit()
        print(f"Seed complete. Added {created_products} new product(s).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
