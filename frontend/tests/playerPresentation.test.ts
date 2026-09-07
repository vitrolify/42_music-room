import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getActivePlaylistRoute,
    getPlayerPresentation,
    isPlayerPath,
    PLAYER_ROUTE,
} from '../src/lib/playerPresentation.ts';

test('hydrates an active playlist into a navigable player presentation', () => {
    const presentation = getPlayerPresentation({
        videoId: 'abc123',
        activePlaylistId: 42,
        pathname: '/(tabs)/player',
    });

    assert.equal(presentation.shouldMountHost, true);
    assert.equal(presentation.showMiniPlayer, true);
    assert.equal(presentation.showPlayerSurface, true);
    assert.equal(presentation.activePlaylistRoute, '/(tabs)/playlist/42');
});

test('keeps the player mounted but hides controls after navigating away', () => {
    const onPlayerRoute = getPlayerPresentation({
        videoId: 'abc123', activePlaylistId: 42, pathname: '/(tabs)/playlist/42',
    });
    const elsewhere = getPlayerPresentation({
        videoId: 'abc123', activePlaylistId: 42, pathname: '/(tabs)/search',
    });

    assert.equal(onPlayerRoute.shouldMountHost, true);
    assert.equal(onPlayerRoute.showPlayerSurface, false);
    assert.equal(elsewhere.shouldMountHost, true);
    assert.equal(elsewhere.showPlayerSurface, false);
});

test('only the dedicated player route exposes full controls', () => {
    assert.equal(PLAYER_ROUTE, '/player');
    assert.equal(isPlayerPath('/(tabs)/player'), true);
    assert.equal(isPlayerPath('/player'), true);
    assert.equal(isPlayerPath('/(tabs)/playlist/42'), false);
    assert.equal(isPlayerPath('/(tabs)/player/settings'), false);
});

test('terminal paused playback retains the mini-player route', () => {
    const terminalPlayback = getPlayerPresentation({
        videoId: 'final-track', activePlaylistId: 7, pathname: '/(tabs)/friends',
    });

    assert.equal(terminalPlayback.showMiniPlayer, true);
    assert.equal(terminalPlayback.activePlaylistRoute, '/(tabs)/playlist/7');
    assert.equal(getActivePlaylistRoute(null), null);
});

test('terminal paused playback still exposes the dedicated player', () => {
    const terminalPlayback = getPlayerPresentation({
        videoId: 'final-track', activePlaylistId: 7, pathname: '/player',
    });

    assert.equal(terminalPlayback.shouldMountHost, true);
    assert.equal(terminalPlayback.showPlayerSurface, true);
    assert.equal(terminalPlayback.activePlaylistRoute, '/(tabs)/playlist/7');
});

test('a stale standalone video cannot render a non-navigable player', () => {
    const stalePlayback = getPlayerPresentation({
        videoId: 'abc123', activePlaylistId: null, pathname: '/(tabs)/index',
    });

    assert.deepEqual(stalePlayback, {
        shouldMountHost: false,
        showMiniPlayer: false,
        showPlayerSurface: false,
        activePlaylistRoute: null,
    });
});
