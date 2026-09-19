import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getFirebaseToken,
    getPlaybackWebSocketUrl,
    request,
} from '../lib/api/client';
import type {
    PlaybackEvent,
    PlaybackSnapshot,
    SyncStatus,
} from '../lib/api/playback.types';
import { registerCurrentDevice } from '../lib/deviceIdentity';

type PlaybackSyncOptions = {
    isAuthenticated: boolean;
    onSnapshot: (snapshot: PlaybackSnapshot | null) => void;
    ownerId?: string | null;
    onUnauthorized?: () => void;
};

type PlaybackSync = {
    syncStatus: SyncStatus;
    sessionId: string;
    serverVersion: number;
    activePlaylistTrackId: number | null;
    isController: boolean;
    applyCommandSnapshot: (snapshot: PlaybackSnapshot) => void;
    getCurrentPosition: () => number | null;
    markAutoplayBlocked: () => void;
    markPlaybackStarted: () => void;
    isCurrentSnapshot: (version: number) => boolean;
    currentSnapshot: PlaybackSnapshot | null;
};

export function usePlaybackSync({
    isAuthenticated,
    onSnapshot,
    ownerId = null,
    onUnauthorized,
}: PlaybackSyncOptions): PlaybackSync {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(
        isAuthenticated ? 'connecting' : 'offline',
    );
    const [serverVersion, setServerVersion] = useState(0);
    const [activePlaylistTrackId, setActivePlaylistTrackId] = useState<number | null>(null);
    const sessionIdRef = useRef(
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    );
    const socketRef = useRef<WebSocket | null>(null);
    const desiredSnapshotRef = useRef<PlaybackSnapshot | null>(null);
    const serverVersionRef = useRef(0);

    const markAutoplayBlocked = useCallback(() => {
        setSyncStatus('autoplay-blocked');
    }, []);

    const markPlaybackStarted = useCallback(() => {
        setSyncStatus(current => current === 'autoplay-blocked' ? 'synced' : current);
    }, []);

    const isCurrentSnapshot = useCallback(
        (version: number) => desiredSnapshotRef.current?.version === version,
        [],
    );

    const applyCommandSnapshot = useCallback((snapshot: PlaybackSnapshot) => {
        desiredSnapshotRef.current = snapshot;
        serverVersionRef.current = snapshot.version;
        setServerVersion(snapshot.version);
        setActivePlaylistTrackId(snapshot.active_playlist_track_id);
        onSnapshot(snapshot);
    }, [onSnapshot]);

    useEffect(() => {
        let cancelled = false;
        let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

        desiredSnapshotRef.current = null;
        serverVersionRef.current = 0;
        setServerVersion(0);
        setActivePlaylistTrackId(null);

        if (!isAuthenticated) {
            setSyncStatus('offline');
            return () => undefined;
        }

        const connect = async () => {
            if (cancelled) return;

            setSyncStatus('connecting');

            try {
                if (!ownerId) {
                    const initial = await request<PlaybackSnapshot | null>('GET', '/playback/state');
                    if (!cancelled) {
                        if (initial && initial.version > serverVersionRef.current) {
                            applyCommandSnapshot(initial);
                        } else if (!initial) {
                            onSnapshot(null);
                        }
                    }
                }

                const token = await getFirebaseToken();
                if (!token || cancelled) return;

                const deviceId = await registerCurrentDevice();
                const socket = new WebSocket(
                    getPlaybackWebSocketUrl(sessionIdRef.current, token, deviceId, ownerId ?? undefined),
                );
                socketRef.current = socket;
                socket.onopen = () => {
                    if (cancelled || socketRef.current !== socket) return;
                    setSyncStatus('synced');
                };
                socket.onmessage = event => {
                    if (cancelled || socketRef.current !== socket) return;
                    try {
                        const message = JSON.parse(event.data) as PlaybackEvent;
                        if (
                            message.type === 'PLAYBACK_STATE_CHANGED'
                            && message.payload.version > serverVersionRef.current
                        ) {
                            applyCommandSnapshot(message.payload);
                        }
                    } catch {
                        // Ignore malformed messages from the server.
                    }
                };
                socket.onclose = event => {
                    if (socketRef.current !== socket) return;
                    socketRef.current = null;
                    if (!cancelled) {
                        if (event.code === 1008) {
                            setSyncStatus('revoked');
                            onUnauthorized?.();
                        }
                        setSyncStatus('offline');
                        reconnectTimer = setTimeout(connect, 1500);
                    }
                };
                socket.onerror = () => {
                    if (cancelled || socketRef.current !== socket) return;
                    setSyncStatus('offline');
                };
            } catch {
                if (!cancelled) {
                    setSyncStatus('offline');
                    reconnectTimer = setTimeout(connect, 1500);
                }
            }
        };

        void connect();

        return () => {
            cancelled = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            socketRef.current?.close();
            socketRef.current = null;
        };
    }, [isAuthenticated, onSnapshot, onUnauthorized, ownerId]);

    const getCurrentPosition = useCallback(() => {
        const snapshot = desiredSnapshotRef.current;
        if (!snapshot) return null;

        const elapsedSeconds = snapshot.status === 'playing'
            ? Math.max(0, (Date.now() - Date.parse(snapshot.updated_at)) / 1000)
            : 0;
        return snapshot.position_seconds + elapsedSeconds;
    }, []);

    return {
        syncStatus,
        sessionId: sessionIdRef.current,
        serverVersion,
        activePlaylistTrackId,
        isController: desiredSnapshotRef.current?.controller_session_id === sessionIdRef.current,
        applyCommandSnapshot,
        getCurrentPosition,
        markAutoplayBlocked,
        markPlaybackStarted,
        isCurrentSnapshot,
        currentSnapshot: desiredSnapshotRef.current,
    };
}
