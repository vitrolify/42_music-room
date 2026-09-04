import * as Firebase from '../firebase';

function getApiBaseUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) return envUrl;

    try {
        const Constants = require('expo-constants').default;
        const debuggerHost: string | undefined =
            Constants.expoConfig?.hostUri ?? Constants.debuggerHost;

        if (debuggerHost) {
            const ip = debuggerHost.split(':')[0];
            return `http://${ip}/api/v1`;
        }
    } catch {}

    return 'http://localhost/api/v1';
}

export const API_BASE = getApiBaseUrl();

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class ApiError extends Error {
    status: number;
    errorCode?: string;

    constructor(message: string, status: number, errorCode?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errorCode = errorCode;
    }
}

export async function getFirebaseToken(): Promise<string | null> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            const token = await Firebase.getAuthToken();
            if (token) return token;
        } catch {}

        await sleep(200);
    }

    return null;
}

export function getPlaylistWebSocketUrl(playlistId: number, token: string): string {
    const apiUrl = new URL(API_BASE);
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    apiUrl.pathname = apiUrl.pathname.replace(/\/?api\/v1\/?$/, '') + `/ws/playlists/${playlistId}`;
    apiUrl.search = `?token=${encodeURIComponent(token)}`;
    return apiUrl.toString();
}

export function getPlaybackWebSocketUrl(sessionId: string, token: string): string {
    const apiUrl = new URL(API_BASE);
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    apiUrl.pathname = apiUrl.pathname.replace(/\/?api\/v1\/?$/, '') + '/ws/playback';
    apiUrl.search = `?token=${encodeURIComponent(token)}&session_id=${encodeURIComponent(sessionId)}`;
    return apiUrl.toString();
}

export async function request<T>(
    method: string,
    path: string,
    body?: unknown,
): Promise<T> {
    const token = await getFirebaseToken();

    if (!token) {
        throw new ApiError('Not authenticated', 401, 'AUTH_TOKEN_MISSING');
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(
            err.message ?? res.statusText ?? 'Request failed',
            res.status,
            err.error_code,
        );
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}
