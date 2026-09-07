import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getActivePlaylistRoute,
    getPlayerPresentation,
    isActivePlaylistPath,
} from '../src/lib/playerPresentation.ts';

test('hydrates an active playlist into a navigable player presentation', () => {
    const presentation = getPlayerPresentation({
        videoId: 'abc123',
        activePlaylistId: 42,
        pathname: '/(tabs)/index',
    });

    assert.equal(presentation.shouldMountHost, true);
    assert.equal(presentation.showMiniPlayer, true);
    assert.equal(presentation.showPlayerSurface, false);
    assert.equal(presentation.activePlaylistRoute, '/(tabs)/playlist/42');
});

test('keeps the player mounted but hides controls after navigating away', () => {
    const onActivePlaylist = getPlayerPresentation({
        videoId: 'abc123', activePlaylistId: 42, pathname: '/(tabs)/playlist/42',
    });
    const elsewhere = getPlayerPresentation({
        videoId: 'abc123', activePlaylistId: 42, pathname: '/(tabs)/search',
    });

    assert.equal(onActivePlaylist.shouldMountHost, true);
    assert.equal(onActivePlaylist.showPlayerSurface, true);
    assert.equal(elsewhere.shouldMountHost, true);
    assert.equal(elsewhere.showPlayerSurface, false);
});

test('only the exact active playlist route exposes controls', () => {
    assert.equal(isActivePlaylistPath('/(tabs)/playlist/42', 42), true);
    assert.equal(isActivePlaylistPath('/(tabs)/playlist/42/edit', 42), true);
    assert.equal(isActivePlaylistPath('/(tabs)/playlist/420', 42), false);
    assert.equal(isActivePlaylistPath('/(tabs)/playlist/42', null), false);
});

test('terminal paused playback retains the mini-player route', () => {
    const terminalPlayback = getPlayerPresentation({
        videoId: 'final-track', activePlaylistId: 7, pathname: '/(tabs)/friends',
    });

    assert.equal(terminalPlayback.showMiniPlayer, true);
    assert.equal(terminalPlayback.activePlaylistRoute, '/(tabs)/playlist/7');
    assert.equal(getActivePlaylistRoute(null), null);
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
