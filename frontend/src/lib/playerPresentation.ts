/**
 * Keep the route-dependent presentation rules independent from the player
 * instance. The host stays mounted while changing routes; only its surface is
 * hidden outside the active playlist.
 */
export function getActivePlaylistRoute(activePlaylistId: number | null): string | null {
    return activePlaylistId === null ? null : `/(tabs)/playlist/${activePlaylistId}`;
}

export function isActivePlaylistPath(pathname: string, activePlaylistId: number | null): boolean {
    return activePlaylistId !== null
        && new RegExp(`/playlist/${activePlaylistId}(?:/|$)`).test(pathname);
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
        showPlayerSurface: hasActivePlaylistPlayback
            && isActivePlaylistPath(pathname, activePlaylistId),
        activePlaylistRoute: getActivePlaylistRoute(activePlaylistId),
    };
}
