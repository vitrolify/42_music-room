import logging
import os
import re

import httpx

logger = logging.getLogger(__name__)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")


def _parse_iso_duration(duration: str) -> int:
    match = re.match(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$", duration)
    if not match:
        return 0

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)

    return hours * 3600 + minutes * 60 + seconds


async def fetch_youtube_video_info(video_id: str) -> dict:
    if not YOUTUBE_API_KEY:
        raise RuntimeError("YOUTUBE_API_KEY not set.")

    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {"part": "snippet,contentDetails", "id": video_id, "key": YOUTUBE_API_KEY}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)

        if response.status_code != 200:
            logger.error(
                {
                    "event": "youtube_api_error",
                    "status_code": response.status_code,
                    "response": response.text,
                }
            )
            raise ValueError(
                f"Error contactig YouTube API. HTTP {response.status_code}"
            )

        data = response.json()

        if not data.get("items"):
            raise ValueError(f"Video{video_id} not found")

        item = data["items"][0]
        snippet = item["snippet"]
        content_details = item["contentDetails"]

        thumbnails = snippet.get("thumbnails", {})
        high_res_thumb = thumbnails.get("high", {}).get("url")
        default_thumb = thumbnails.get("default", {}).get("url", "")

        return {
            "title": snippet.get("title", "Título Desconhecido"),
            "channel_title": snippet.get("channelTitle", "Canal Desconhecido"),
            "thumbnail_url": high_res_thumb or default_thumb,
            "duration_seconds": _parse_iso_duration(
                content_details.get("duration", "PT0S")
            ),
        }
