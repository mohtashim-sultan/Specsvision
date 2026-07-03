"""Add product category; normalize order statuses.

Revision ID: 0002_category_orders
Revises: 0001_initial
Create Date: 2026-05-13

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_category_orders"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("category", sa.String(length=64), nullable=True))
    op.create_index("ix_products_category", "products", ["category"], unique=False)

    conn = op.get_bind()
    conn.execute(sa.text("UPDATE orders SET status = 'delivered' WHERE status = 'completed'"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE orders SET status = 'completed' WHERE status = 'delivered'"))

    op.drop_index("ix_products_category", table_name="products")
    op.drop_column("products", "category")
