import type {
    FriendRequest,
    FriendRequestIncoming,
    FriendRequestOutgoing,
    FriendUser,
} from './friends.types';
import { request } from './client';

export async function getFriends(): Promise<FriendUser[]> {
    return request<FriendUser[]>('GET', '/friends');
}

export async function getIncomingRequests(): Promise<FriendRequestIncoming[]> {
    return request<FriendRequestIncoming[]>('GET', '/friends/requests');
}

export async function getOutgoingRequests(): Promise<FriendRequestOutgoing[]> {
    return request<FriendRequestOutgoing[]>('GET', '/friends/requests/outgoing');
}

export async function sendFriendRequestByEmail(email: string): Promise<FriendRequest> {
    return request<FriendRequest>('POST', '/friends/requests/by-email', { email });
}

export async function sendFriendRequestToUser(userId: string): Promise<FriendRequest> {
    return request<FriendRequest>('POST', `/friends/requests/${userId}`);
}

export async function acceptFriendRequest(requestId: number): Promise<FriendRequest> {
    return request<FriendRequest>('PATCH', `/friends/requests/${requestId}/accept`);
}

export async function declineFriendRequest(requestId: number): Promise<FriendRequest> {
    return request<FriendRequest>('PATCH', `/friends/requests/${requestId}/decline`);
}

export async function deleteFriend(friendId: string): Promise<void> {
    return request<void>('DELETE', `/friends/${friendId}`);
}

export type {
    FriendStatus,
    FriendRequest,
    FriendRequestIncoming,
    FriendRequestOutgoing,
    FriendUser,
} from './friends.types';