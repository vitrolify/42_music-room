import * as Firebase from './firebase';

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

const API_BASE = getApiBaseUrl();

async function getFirebaseToken(): Promise<string | null> {
    try {
        return await Firebase.getAuthToken();
    } catch {
        return null;
    }
}

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
): Promise<T> {
    const token = await getFirebaseToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message ?? 'Request failed');
    }

    return res.json() as Promise<T>;
}

export type UserProfile = {
    id: string;
    firebase_uid: string;
    email: string | null;
    display_name: string | null;
    avatar: string;
    created_at: string;
    updated_at: string;
};

export async function getMyProfile(): Promise<UserProfile> {
    return request<UserProfile>('GET', '/users/me');
}

export async function updateMyProfile(data: {
    display_name?: string | null;
    avatar?: string;
}): Promise<UserProfile> {
    return request<UserProfile>('PUT', '/users/me', data);
}
