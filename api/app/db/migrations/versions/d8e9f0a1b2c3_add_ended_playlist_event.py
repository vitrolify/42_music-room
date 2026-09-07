"""add ended playlist event

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-09-07
"""

from alembic import op

revision = "d8e9f0a1b2c3"
down_revision = "c7d8e9f0a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE playlist_event_type ADD VALUE IF NOT EXISTS 'ended'")


def downgrade() -> None:
    # PostgreSQL enum values cannot safely be removed in-place.
    pass
