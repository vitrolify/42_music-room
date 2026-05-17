"""Interfaces de elegibilidade para convites e licencas (T020).

Apenas contratos (Protocols). As implementacoes concretas vem com T054
(Invitation) e T055 (LicenseRule).
"""

from enum import StrEnum
from typing import Protocol
from uuid import UUID


class ResourceType(StrEnum):
    """Tipos de recurso pra convites (Invitation.resource_type)."""
    EVENT = "event"
    PLAYLIST = "playlist"


class LicenseAction(StrEnum):
    """Acoes governadas por licenca (LicenseRule.resource_type)."""
    EVENT_VOTE = "event_vote"
    PLAYLIST_EDIT = "playlist_edit"
    PLAYBACK_CONTROL = "playback_control"


class InvitationService(Protocol):
    """Responde: esse user esta convidado pra esse recurso?"""

    async def is_invited(
        self,
        user_id: UUID,
        resource_type: ResourceType,
        resource_id: UUID,
    ) -> bool: ...


class LicenseService(Protocol):
    """Devolve o modo de licenca configurado (open / invite_only / location_time)."""

    async def get_mode(
        self,
        action: LicenseAction,
        resource_id: UUID,
    ) -> str: ...
