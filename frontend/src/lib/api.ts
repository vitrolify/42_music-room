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

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export type Playlist = {
    id: number;
    name: string;
    owner_id: string;
    public: boolean;
    invited_only_edit: boolean;
    created_at: string;
    updated_at: string;
};

export type PlaylistCreate = {
    name: string;
    public?: boolean;
    invited_only_edit?: boolean;
};

export type PlaylistUpdate = {
    name?: string;
    public?: boolean;
    invited_only_edit?: boolean;
};

export type Invite = {
    id: number;
    user_id: string;
    playlist_id: number;
    status: InviteStatus;
    created_at: string;
    updated_at: string;
};

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

export async function listPlaylists(): Promise<Playlist[]> {
    return request<Playlist[]>('GET', '/playlists');
}

export async function createPlaylist(data: PlaylistCreate): Promise<Playlist> {
    return request<Playlist>('POST', '/playlists', data);
}

export async function getPlaylist(id: number): Promise<Playlist> {
    return request<Playlist>('GET', `/playlists/${id}`);
}

export async function updatePlaylist(id: number, data: PlaylistUpdate): Promise<Playlist> {
    return request<Playlist>('PATCH', `/playlists/${id}`, data);
}

export async function deletePlaylist(id: number): Promise<void> {
    return request<void>('DELETE', `/playlists/${id}`);
}

export async function listInvites(playlistId: number): Promise<Invite[]> {
    return request<Invite[]>('GET', `/playlists/${playlistId}/invites`);
}

export async function createInviteByEmail(playlistId: number, email: string): Promise<Invite> {
    return request<Invite>('POST', `/playlists/${playlistId}/invites/by-email`, { email });
}

export async function acceptInvite(inviteId: number): Promise<Invite> {
    return request<Invite>('PATCH', `/invites/${inviteId}/accept`);
}

export async function declineInvite(inviteId: number): Promise<Invite> {
    return request<Invite>('PATCH', `/invites/${inviteId}/decline`);
}

export async function deleteInvite(inviteId: number): Promise<void> {
    return request<void>('DELETE', `/invites/${inviteId}`);
}
