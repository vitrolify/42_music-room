import { Platform } from 'react-native';
import { request } from './api/client';
import { getFriends } from './api/friends';
import type { DeviceDelegationGateway, DeviceDelegationSnapshot, DeviceDelegate, EligibleFriend, PlaybackDevice } from './deviceDelegation.types';

type ApiDevice = { id: string; owner_id: string; name: string; created_at: string };
type ApiDelegate = { device_id: string; delegate_user_id: string; created_at: string };

function platformFor(device: ApiDevice, currentDeviceId: string): PlaybackDevice['platform'] {
    if (device.id === currentDeviceId) return Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android';
    const name = device.name.toLowerCase();
    return name.includes('ios') || name.includes('iphone') ? 'ios' : name.includes('android') ? 'android' : 'web';
}

export const deviceDelegationApiGateway: DeviceDelegationGateway = {
    async load(ownerId, currentDeviceId): Promise<DeviceDelegationSnapshot> {
        const [apiDevices, friends] = await Promise.all([
            request<ApiDevice[]>('GET', '/devices/'),
            getFriends(),
        ]);
        const delegates = await Promise.all(apiDevices.map(device => request<ApiDelegate[]>('GET', `/devices/${device.id}/delegates`)));
        const eligibleFriends: EligibleFriend[] = friends.map(friend => ({
            id: friend.id,
            displayName: friend.display_name ?? friend.email ?? 'Friend',
            email: friend.email ?? '',
            avatar: friend.avatar,
        }));
        const friendMap = new Map(eligibleFriends.map(friend => [friend.id, friend]));
        const devices: PlaybackDevice[] = apiDevices.map(device => ({
            id: device.id,
            ownerId: device.owner_id || ownerId,
            name: device.name,
            platform: platformFor(device, currentDeviceId),
            createdAt: device.created_at,
            isCurrent: device.id === currentDeviceId,
        }));
        const delegatesByDevice: Record<string, DeviceDelegate[]> = {};
        apiDevices.forEach((device, index) => {
            delegatesByDevice[device.id] = delegates[index].map(delegate => {
                const friend = friendMap.get(delegate.delegate_user_id);
                return {
                    deviceId: delegate.device_id,
                    userId: delegate.delegate_user_id,
                    displayName: friend?.displayName ?? 'Friend',
                    email: friend?.email ?? 'Friend from your network',
                    grantedAt: delegate.created_at,
                };
            });
        });
        return { devices, delegatesByDevice, friends: eligibleFriends };
    },
    rename(deviceId, name) {
        return request<ApiDevice>('PATCH', `/devices/${deviceId}`, { name }).then(device => ({
            id: device.id, ownerId: device.owner_id, name: device.name, platform: platformFor(device, device.id), createdAt: device.created_at, isCurrent: false,
        }));
    },
    async grant(deviceId, friendId) {
        const delegate = await request<ApiDelegate>('POST', `/devices/${deviceId}/delegates`, { delegate_user_id: friendId });
        return { deviceId: delegate.device_id, userId: delegate.delegate_user_id, displayName: 'Friend', email: 'Friend from your network', grantedAt: delegate.created_at };
    },
    async revoke(deviceId, friendId) {
        await request<void>('DELETE', `/devices/${deviceId}/delegates/${friendId}`);
    },
    subscribe() { return () => undefined; },
};
