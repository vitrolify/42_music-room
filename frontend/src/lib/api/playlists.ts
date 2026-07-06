import { request } from './client';

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
