"""add playlist scoped playback state

Revision ID: c7d8e9f0a1b2
Revises: a1b2c3d4e5f6
"""

from alembic import op
import sqlalchemy as sa

revision = "c7d8e9f0a1b2"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_playback_states", sa.Column("active_playlist_id", sa.Integer(), nullable=True))
    op.add_column("user_playback_states", sa.Column("active_playlist_track_id", sa.Integer(), nullable=True))
    op.add_column("user_playback_states", sa.Column("controller_device_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_user_playback_states_active_playlist_id_playlists",
        "user_playback_states", "playlists", ["active_playlist_id"], ["id"], ondelete="SET NULL",
    )
    # A completed/removed track must not erase the terminal playback snapshot.
    op.create_foreign_key(
        "fk_user_playback_states_active_playlist_track_id_playlist_track",
        "user_playback_states", "playlist_track", ["active_playlist_track_id"], ["id"], ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_user_playback_states_controller_device_id_devices",
        "user_playback_states", "devices", ["controller_device_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_user_playback_states_controller_device_id_devices", "user_playback_states", type_="foreignkey")
    op.drop_constraint("fk_user_playback_states_active_playlist_track_id_playlist_track", "user_playback_states", type_="foreignkey")
    op.drop_constraint("fk_user_playback_states_active_playlist_id_playlists", "user_playback_states", type_="foreignkey")
    op.drop_column("user_playback_states", "controller_device_id")
    op.drop_column("user_playback_states", "active_playlist_track_id")
    op.drop_column("user_playback_states", "active_playlist_id")
