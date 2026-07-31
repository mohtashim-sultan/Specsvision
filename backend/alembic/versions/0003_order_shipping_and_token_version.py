"""order shipping/financial/tracking + auth token_version

Revision ID: 0003_order_shipping
Revises: 1df9ce606352
Create Date: 2026-07-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_order_shipping"
down_revision: Union[str, Sequence[str], None] = "1df9ce606352"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Revocable-token support.
    op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("admins", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))

    # Order financial breakdown.
    op.add_column("orders", sa.Column("subtotal", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("tax", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("shipping_fee", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("discount", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("coupon_code", sa.String(length=64), nullable=True))

    # Order contact + shipping address.
    op.add_column("orders", sa.Column("contact_email", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("contact_phone", sa.String(length=64), nullable=True))
    op.add_column("orders", sa.Column("ship_full_name", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("ship_address", sa.String(length=512), nullable=True))
    op.add_column("orders", sa.Column("ship_city", sa.String(length=128), nullable=True))
    op.add_column("orders", sa.Column("ship_state", sa.String(length=128), nullable=True))
    op.add_column("orders", sa.Column("ship_zip", sa.String(length=32), nullable=True))
    op.add_column("orders", sa.Column("tracking_number", sa.String(length=64), nullable=True))
    op.add_column("orders", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    for col in (
        "updated_at",
        "tracking_number",
        "ship_zip",
        "ship_state",
        "ship_city",
        "ship_address",
        "ship_full_name",
        "contact_phone",
        "contact_email",
        "coupon_code",
        "discount",
        "shipping_fee",
        "tax",
        "subtotal",
    ):
        op.drop_column("orders", col)
    op.drop_column("admins", "token_version")
    op.drop_column("users", "token_version")
