from pydantic import BaseModel, ConfigDict


class TrackInfoRead(BaseModel):
    id: str
    title: str
    channel_title: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int | None = None

    model_config = ConfigDict(from_attributes=True)
