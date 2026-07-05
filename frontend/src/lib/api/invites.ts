import { request } from './client';
import type { Playlist } from './playlists';

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export type Invite = {
    id: number;
    user_id: string;
    playlist_id: number;
    status: InviteStatus;
    created_at: string;
    updated_at: string;
};

export type InviteUser = {
    id: string;
    email: string | null;
    display_name: string | null;
    avatar: string;
};

export type InviteWithPlaylist = Invite & {
    playlist: Playlist;
    owner: InviteUser;
};

export type InviteWithUser = Invite & {
    user: InviteUser;
};

export async function getMyInvites(): Promise<InviteWithPlaylist[]> {
    return request<InviteWithPlaylist[]>('GET', '/invites/mine');
}

export async function listInvites(playlistId: number): Promise<InviteWithUser[]> {
    return request<InviteWithUser[]>('GET', `/playlists/${playlistId}/invites`);
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
