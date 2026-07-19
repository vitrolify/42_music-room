"""add paused status

Revision ID: 29fd3d2d0fd7
Revises: b4ae3edf2903
Create Date: 2026-07-09 16:22:36.059542

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '29fd3d2d0fd7'
down_revision: Union[str, None] = 'b4ae3edf2903'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE playlist_track SET status = 'queued' WHERE status = 'played'")
    op.execute("ALTER TYPE track_playback_status RENAME TO track_playback_status_old")
    op.execute("CREATE TYPE track_playback_status AS ENUM ('paused', 'queued', 'playing')")
    op.execute(
        "ALTER TABLE playlist_track ALTER COLUMN status TYPE track_playback_status USING "
        "status::text::track_playback_status"
    )
    op.execute("DROP TYPE track_playback_status_old")


def downgrade() -> None:
    op.execute("UPDATE playlist_track SET status = 'queued' WHERE status = 'paused'")
    op.execute("ALTER TYPE track_playback_status RENAME TO track_playback_status_old")
    op.execute("CREATE TYPE track_playback_status AS ENUM ('played', 'queued', 'playing')")
    op.execute(
        "ALTER TABLE playlist_track ALTER COLUMN status TYPE track_playback_status USING "
        "status::text::track_playback_status"
    )
    op.execute("DROP TYPE track_playback_status_old")
