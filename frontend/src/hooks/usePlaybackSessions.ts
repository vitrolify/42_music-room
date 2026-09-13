import { useCallback, useEffect, useState } from 'react';
import { request } from '../lib/api/client';
import type { PlaybackSession } from '../lib/api/playback.types';

export function usePlaybackSessions(isAuthenticated: boolean) {
    const [sessions, setSessions] = useState<PlaybackSession[]>([]);
    const [loading, setLoading] = useState(isAuthenticated);

    const refresh = useCallback(async () => {
        if (!isAuthenticated) {
            setSessions([]);
            return;
        }
        try {
            setSessions(await request<PlaybackSession[]>('GET', '/playback/sessions'));
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        void refresh();
        if (!isAuthenticated) return undefined;
        const timer = setInterval(() => void refresh(), 5000);
        return () => clearInterval(timer);
    }, [isAuthenticated, refresh]);

    const remove = useCallback((ownerId: string) => {
        setSessions(current => current.filter(session => session.owner_id !== ownerId));
    }, []);

    return { sessions, loading, refresh, remove };
}
