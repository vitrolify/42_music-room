/**
 * Keep route presentation independent from the player instance. The host stays
 * mounted while changing routes; only the dedicated player route exposes its
 * full controls.
 */
export const PLAYER_ROUTE = '/player' as const;

export function getActivePlaylistRoute(activePlaylistId: number | null): string | null {
    return activePlaylistId === null ? null : `/(tabs)/playlist/${activePlaylistId}`;
}

export function isPlayerPath(pathname: string): boolean {
    return pathname === PLAYER_ROUTE || pathname === '/(tabs)/player';
}

export function getPlayerPresentation({
    videoId,
    activePlaylistId,
    pathname,
}: {
    videoId: string | null;
    activePlaylistId: number | null;
    pathname: string;
}) {
    const hasActivePlaylistPlayback = Boolean(videoId && activePlaylistId !== null);

    return {
        // This intentionally does not depend on pathname. Navigation must not
        // recreate the underlying YouTube instance.
        shouldMountHost: hasActivePlaylistPlayback,
        showMiniPlayer: hasActivePlaylistPlayback,
        showPlayerSurface: hasActivePlaylistPlayback && isPlayerPath(pathname),
        activePlaylistRoute: getActivePlaylistRoute(activePlaylistId),
    };
}
