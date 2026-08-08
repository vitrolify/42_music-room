export type FriendStatus = 'pending' | 'accepted' | 'declined';

export type FriendRequest = {
    id: number;
    requester_id: string;
    addressee_id: string;
    status: FriendStatus;
    created_at: string;
    updated_at: string;
};

export type FriendUser = {
    id: string;
    email: string | null;
    display_name: string | null;
    avatar: string;
};

export type FriendRequestIncoming = FriendRequest & {
    requester: FriendUser;
};

export type FriendRequestOutgoing = FriendRequest & {
    addressee: FriendUser;
};