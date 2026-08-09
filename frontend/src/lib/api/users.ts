import { request } from './client';

export type UserProfile = {
    id: string;
    firebase_uid: string;
    email: string | null;
    display_name: string | null;
    avatar: string;
    mini_bio: string | null;
    favorite_artists: string | null;
    favorite_genre: string | null;
    profile_visibility: 'public' | 'friends_only';
    created_at: string;
    updated_at: string;
};

export type PublicProfile = {
    id: string;
    display_name: string | null;
    avatar: string;
    email: string | null;
    mini_bio: string | null;
    favorite_artists: string | null;
    favorite_genre: string | null;
    is_self: boolean;
    is_friend: boolean;
    outgoing_request_pending: boolean;
    incoming_request_pending: boolean;
    request_id: number | null;
};

export async function getMyProfile(): Promise<UserProfile> {
    return request<UserProfile>('GET', '/users/me');
}

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
    return request<PublicProfile>('GET', `/users/${userId}`);
}

export async function updateMyProfile(data: {
    display_name?: string | null;
    avatar?: string;
    mini_bio?: string | null;
    favorite_artists?: string | null;
    favorite_genre?: string | null;
    profile_visibility?: 'public' | 'friends_only';
}): Promise<UserProfile> {
    return request<UserProfile>('PUT', '/users/me', data);
}
