export type DevicePlatform = 'web' | 'ios' | 'android';

export type PlaybackDevice = {
    id: string;
    ownerId: string;
    name: string;
    platform: DevicePlatform;
    createdAt: string;
    isCurrent: boolean;
};

export type EligibleFriend = {
    id: string;
    displayName: string;
    email: string;
    avatar: string;
};

export type DeviceDelegate = {
    deviceId: string;
    userId: string;
    displayName: string;
    email: string;
    grantedAt: string;
};

export type DelegationLoadState = 'idle' | 'loading' | 'ready' | 'error';
export type DelegationOperation = 'renaming' | 'granting' | 'revoking' | null;

export type DeviceDelegationSnapshot = {
    devices: PlaybackDevice[];
    delegatesByDevice: Record<string, DeviceDelegate[]>;
    friends: EligibleFriend[];
};

export interface DeviceDelegationGateway {
    load(ownerId: string, currentDeviceId: string): Promise<DeviceDelegationSnapshot>;
    rename(deviceId: string, name: string): Promise<PlaybackDevice>;
    grant(deviceId: string, friendId: string): Promise<DeviceDelegate>;
    revoke(deviceId: string, friendId: string): Promise<void>;
    subscribe(listener: () => void): () => void;
}
