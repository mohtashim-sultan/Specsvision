"""email otp verification fields

Revision ID: 0007_email_otp
Revises: 0005_specs_wishlist
Create Date: 2026-08-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0007_email_otp"
down_revision: Union[str, Sequence[str], None] = "0005_specs_wishlist"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "users",
        sa.Column("otp_code", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("otp_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "otp_expires_at")
    op.drop_column("users", "otp_code")
    op.drop_column("users", "is_verified")
