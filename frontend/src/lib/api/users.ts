import { request } from './client';

export type UserProfile = {
    id: string;
    firebase_uid: string;
    email: string | null;
    display_name: string | null;
    avatar: string;
    created_at: string;
    updated_at: string;
};

export type PublicProfile = {
    id: string;
    display_name: string | null;
    avatar: string;
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
}): Promise<UserProfile> {
    return request<UserProfile>('PUT', '/users/me', data);
}
