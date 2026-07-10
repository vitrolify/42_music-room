"""add_delete_event

Revision ID: f7aeb1a9a555
Revises: b0dacb96408c
Create Date: 2026-07-10 20:52:09.579316

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7aeb1a9a555'
down_revision: Union[str, None] = 'b0dacb96408c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE playlist_event_type ADD VALUE IF NOT EXISTS 'delete'")


def downgrade() -> None:
    pass
