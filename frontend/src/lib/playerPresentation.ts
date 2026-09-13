/**
 * Keep route presentation independent from the player instance. The host stays
 * mounted while changing routes; only the dedicated player route exposes its
 * full controls.
 */
export const PLAYER_ROUTE = '/player' as const;
export const PLAYER_HEADER_HEIGHT = 56;

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
    isAuthenticated = true,
}: {
    videoId: string | null;
    activePlaylistId: number | null;
    pathname: string;
    isAuthenticated?: boolean;
}) {
    const hasActivePlaylistPlayback = Boolean(videoId && activePlaylistId !== null);

    return {
        // This intentionally does not depend on pathname. Navigation must not
        // recreate the underlying YouTube instance.
        shouldMountHost: hasActivePlaylistPlayback,
        // Authenticated users get an empty bar too, but a stale standalone
        // video (without a playlist) is not a valid playback surface.
        showMiniPlayer: isAuthenticated && (videoId === null || hasActivePlaylistPlayback),
        showPlayerSurface: hasActivePlaylistPlayback && isPlayerPath(pathname),
        activePlaylistRoute: getActivePlaylistRoute(activePlaylistId),
    };
}
