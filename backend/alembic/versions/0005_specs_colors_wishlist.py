"""product specs/colors, cart+order color, wishlist

Revision ID: 0005_specs_wishlist
Revises: 0004_reviews
Create Date: 2026-07-19 00:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0005_specs_wishlist"
down_revision: Union[str, Sequence[str], None] = "0004_reviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("material", sa.String(length=128), nullable=True))
    op.add_column("products", sa.Column("lens_width_mm", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("bridge_mm", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("temple_mm", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("lens_features", sa.String(length=255), nullable=True))
    op.add_column("products", sa.Column("colors", sa.Text(), nullable=True))

    op.add_column("cart_items", sa.Column("color", sa.String(length=64), nullable=True))
    op.add_column("order_items", sa.Column("color", sa.String(length=64), nullable=True))

    op.create_table(
        "wishlist_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),
    )
    op.create_index("ix_wishlist_items_user_id", "wishlist_items", ["user_id"])
    op.create_index("ix_wishlist_items_product_id", "wishlist_items", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_wishlist_items_product_id", table_name="wishlist_items")
    op.drop_index("ix_wishlist_items_user_id", table_name="wishlist_items")
    op.drop_table("wishlist_items")
    op.drop_column("order_items", "color")
    op.drop_column("cart_items", "color")
    for col in ("colors", "lens_features", "temple_mm", "bridge_mm", "lens_width_mm", "material"):
        op.drop_column("products", col)
