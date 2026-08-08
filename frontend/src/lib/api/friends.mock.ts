import { ApiError } from './client';
import type {
    FriendRequest,
    FriendRequestIncoming,
    FriendRequestOutgoing,
    FriendUser,
} from './friends.types';

const CURRENT_USER_ID = 'me';

const MOCK_USERS: FriendUser[] = [
    { id: 'u-anna', email: 'anna@example.com', display_name: 'Anna', avatar: 'cat' },
    { id: 'u-bob', email: 'bob@example.com', display_name: 'Bob', avatar: 'et' },
    { id: 'u-cleo', email: 'cleo@example.com', display_name: 'Cleo', avatar: 'tape' },
    { id: 'u-diego', email: 'diego@example.com', display_name: 'Diego', avatar: 'globe' },
];

let nextId = 1;

let friends: FriendUser[] = [
    { id: 'u-anna', email: 'anna@example.com', display_name: 'Anna', avatar: 'cat' },
];

let incoming: FriendRequestIncoming[] = [
    {
        id: nextId++,
        requester_id: 'u-bob',
        addressee_id: CURRENT_USER_ID,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        requester: { id: 'u-bob', email: 'bob@example.com', display_name: 'Bob', avatar: 'et' },
    },
];

let outgoing: FriendRequestOutgoing[] = [
    {
        id: nextId++,
        requester_id: CURRENT_USER_ID,
        addressee_id: 'u-diego',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        addressee: { id: 'u-diego', email: 'diego@example.com', display_name: 'Diego', avatar: 'globe' },
    },
];

function delay(ms = 350) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getFriendsMock(): Promise<FriendUser[]> {
    await delay();
    return [...friends];
}

export async function getIncomingRequestsMock(): Promise<FriendRequestIncoming[]> {
    await delay();
    return [...incoming];
}

export async function getOutgoingRequestsMock(): Promise<FriendRequestOutgoing[]> {
    await delay();
    return [...outgoing];
}

export async function sendFriendRequestByEmailMock(email: string): Promise<FriendRequest> {
    await delay();
    const target = MOCK_USERS.find(
        u => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!target) {
        throw new ApiError('No user found with that email.', 404, 'USER_NOT_FOUND');
    }
    if (target.id === CURRENT_USER_ID) {
        throw new ApiError("You can't add yourself.", 400, 'FRIEND_SELF');
    }
    if (friends.some(f => f.id === target.id)) {
        throw new ApiError('Already friends with this user.', 409, 'FRIEND_ALREADY_FRIENDS');
    }
    if (outgoing.some(o => o.addressee_id === target.id)) {
        throw new ApiError('Friend request already sent.', 409, 'FRIEND_DUPLICATE');
    }
    if (incoming.some(i => i.requester_id === target.id)) {
        throw new ApiError('This user has already sent you a request.', 409, 'FRIEND_INCOMING_PENDING');
    }

    const request: FriendRequestOutgoing = {
        id: nextId++,
        requester_id: CURRENT_USER_ID,
        addressee_id: target.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        addressee: target,
    };
    outgoing = [...outgoing, request];
    return request;
}

export async function acceptFriendRequestMock(requestId: number): Promise<FriendRequest> {
    await delay();
    const inviteIndex = incoming.findIndex(i => i.id === requestId);
    if (inviteIndex === -1) {
        throw new ApiError('This request no longer exists.', 404, 'FRIEND_REQUEST_NOT_FOUND');
    }
    const invite = incoming[inviteIndex];
    incoming = incoming.filter(i => i.id !== requestId);
    friends = [...friends, invite.requester];
    return { ...invite, status: 'accepted' };
}

export async function declineFriendRequestMock(requestId: number): Promise<FriendRequest> {
    await delay();
    const invite = incoming.find(i => i.id === requestId);
    if (!invite) {
        throw new ApiError('This request no longer exists.', 404, 'FRIEND_REQUEST_NOT_FOUND');
    }
    incoming = incoming.filter(i => i.id !== requestId);
    return { ...invite, status: 'declined' };
}