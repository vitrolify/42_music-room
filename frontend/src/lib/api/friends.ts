import {
    acceptFriendRequestMock,
    declineFriendRequestMock,
    getFriendsMock,
    getIncomingRequestsMock,
    getOutgoingRequestsMock,
    sendFriendRequestByEmailMock,
} from './friends.mock';
import type {
    FriendRequest,
    FriendRequestIncoming,
    FriendRequestOutgoing,
    FriendUser,
} from './friends.types';
import { request } from './client';

export const FRIENDS_USE_MOCK = true;

export async function getFriends(): Promise<FriendUser[]> {
    if (FRIENDS_USE_MOCK) return getFriendsMock();
    return request<FriendUser[]>('GET', '/friends');
}

export async function getIncomingRequests(): Promise<FriendRequestIncoming[]> {
    if (FRIENDS_USE_MOCK) return getIncomingRequestsMock();
    return request<FriendRequestIncoming[]>('GET', '/friends/requests');
}

export async function getOutgoingRequests(): Promise<FriendRequestOutgoing[]> {
    if (FRIENDS_USE_MOCK) return getOutgoingRequestsMock();
    return request<FriendRequestOutgoing[]>('GET', '/friends/requests/outgoing');
}

export async function sendFriendRequestByEmail(email: string): Promise<FriendRequest> {
    if (FRIENDS_USE_MOCK) return sendFriendRequestByEmailMock(email);
    return request<FriendRequest>('POST', '/friends/requests/by-email', { email });
}

export async function acceptFriendRequest(requestId: number): Promise<FriendRequest> {
    if (FRIENDS_USE_MOCK) return acceptFriendRequestMock(requestId);
    return request<FriendRequest>('PATCH', `/friends/requests/${requestId}/accept`);
}

export async function declineFriendRequest(requestId: number): Promise<FriendRequest> {
    if (FRIENDS_USE_MOCK) return declineFriendRequestMock(requestId);
    return request<FriendRequest>('PATCH', `/friends/requests/${requestId}/decline`);
}

export type {
    FriendStatus,
    FriendRequest,
    FriendRequestIncoming,
    FriendRequestOutgoing,
    FriendUser,
} from './friends.types';