import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getFirebaseToken,
    getPlaybackWebSocketUrl,
    request,
} from '../lib/api/client';
import type {
    PlaybackCommand,
    PlaybackCommandPayload,
    PlaybackEvent,
    PlaybackSnapshot,
    SyncStatus,
} from '../lib/api/playback.types';

type PlaybackSyncOptions = {
    isAuthenticated: boolean;
    onSnapshot: (snapshot: PlaybackSnapshot) => void;
};

type PlaybackSync = {
    syncStatus: SyncStatus;
    sessionId: string;
    serverVersion: number;
    sendCommand: (command: PlaybackCommand, values?: PlaybackCommandPayload) => Promise<void>;
    reportProgress: (currentTime: number, duration: number) => void;
    markAutoplayBlocked: () => void;
    isCurrentSnapshot: (version: number) => boolean;
};

export function usePlaybackSync({
    isAuthenticated,
    onSnapshot,
}: PlaybackSyncOptions): PlaybackSync {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(
        isAuthenticated ? 'connecting' : 'offline',
    );
    const [serverVersion, setServerVersion] = useState(0);
    const sessionIdRef = useRef(
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    );
    const socketRef = useRef<WebSocket | null>(null);
    const desiredSnapshotRef = useRef<PlaybackSnapshot | null>(null);
    const serverVersionRef = useRef(0);
    const lastCheckpointRef = useRef({ time: 0, position: -1 });

    const markAutoplayBlocked = useCallback(() => {
        setSyncStatus('autoplay-blocked');
    }, []);

    const isCurrentSnapshot = useCallback(
        (version: number) => desiredSnapshotRef.current?.version === version,
        [],
    );

    const sendCommand = useCallback(
        async (command: PlaybackCommand, values: PlaybackCommandPayload = {}) => {
            const message = {
                command,
                ...values,
                session_id: sessionIdRef.current,
            };

            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(message));
                return;
            }

            try {
                await request('PUT', '/playback/state', message);
            } catch {
                setSyncStatus('offline');
            }
        },
        [],
    );

    useEffect(() => {
        let cancelled = false;
        let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

        if (!isAuthenticated) {
            setSyncStatus('offline');
            return () => undefined;
        }

        const connect = async () => {
            if (cancelled) return;

            setSyncStatus('connecting');

            try {
                const initial = await request<PlaybackSnapshot | null>(
                    'GET',
                    '/playback/state',
                );
                if (initial && !cancelled && initial.version > serverVersionRef.current) {
                    desiredSnapshotRef.current = initial;
                    serverVersionRef.current = initial.version;
                    setServerVersion(initial.version);
                    onSnapshot(initial);
                }

                const token = await getFirebaseToken();
                if (!token || cancelled) return;

                const socket = new WebSocket(
                    getPlaybackWebSocketUrl(sessionIdRef.current, token),
                );
                socketRef.current = socket;
                socket.onopen = () => setSyncStatus('synced');
                socket.onmessage = event => {
                    try {
                        const message = JSON.parse(event.data) as PlaybackEvent;
                        if (
                            message.type === 'PLAYBACK_STATE_CHANGED'
                            && message.payload.version > serverVersionRef.current
                        ) {
                            desiredSnapshotRef.current = message.payload;
                            serverVersionRef.current = message.payload.version;
                            setServerVersion(message.payload.version);
                            onSnapshot(message.payload);
                        }
                    } catch {
                        // Ignore malformed messages from the server.
                    }
                };
                socket.onclose = () => {
                    socketRef.current = null;
                    if (!cancelled) {
                        setSyncStatus('offline');
                        reconnectTimer = setTimeout(connect, 1500);
                    }
                };
                socket.onerror = () => setSyncStatus('offline');
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
    }, [isAuthenticated, onSnapshot]);

    const reportProgress = useCallback(
        (currentTime: number, duration: number) => {
            const snapshot = desiredSnapshotRef.current;
            const now = Date.now();
            const isController = snapshot?.controller_session_id === sessionIdRef.current;
            const checkpointDue = now - lastCheckpointRef.current.time >= 700;
            const positionChanged = Math.abs(
                currentTime - lastCheckpointRef.current.position,
            ) >= 0.25;

            if (
                isController
                && snapshot?.status === 'playing'
                && checkpointDue
                && positionChanged
            ) {
                lastCheckpointRef.current = { time: now, position: currentTime };
                void sendCommand('checkpoint', {
                    position_seconds: currentTime,
                    duration_seconds: duration,
                });
            }
        },
        [sendCommand],
    );

    return {
        syncStatus,
        sessionId: sessionIdRef.current,
        serverVersion,
        sendCommand,
        reportProgress,
        markAutoplayBlocked,
        isCurrentSnapshot,
    };
}
