import type {
    DeviceDelegate,
    DeviceDelegationGateway,
    DeviceDelegationSnapshot,
    EligibleFriend,
    PlaybackDevice,
} from './deviceDelegation.types';

const friends: EligibleFriend[] = [
    { id: 'friend-lia', displayName: 'Lia Martins', email: 'lia@example.com', avatar: 'owl' },
    { id: 'friend-caio', displayName: 'Caio Nunes', email: 'caio@example.com', avatar: 'vinil' },
    { id: 'friend-nina', displayName: 'Nina Costa', email: 'nina@example.com', avatar: 'cat' },
];

let currentDeviceId = 'local-device-pending';
let devices: PlaybackDevice[] = [
    { id: currentDeviceId, ownerId: 'current-user', name: 'Web browser', platform: 'web', createdAt: '2026-09-01T10:00:00.000Z', isCurrent: true },
    { id: 'mock-phone-001', ownerId: 'current-user', name: 'My phone', platform: 'ios', createdAt: '2026-08-20T10:00:00.000Z', isCurrent: false },
];
let delegatesByDevice: Record<string, DeviceDelegate[]> = {
    [currentDeviceId]: [
        { deviceId: currentDeviceId, userId: 'friend-lia', displayName: 'Lia Martins', email: 'lia@example.com', grantedAt: '2026-09-05T10:00:00.000Z' },
    ],
    'mock-phone-001': [],
};
const listeners = new Set<() => void>();

function notify() { listeners.forEach(listener => listener()); }
function wait<T>(value: T): Promise<T> { return new Promise(resolve => setTimeout(() => resolve(value), 180)); }

export const mockDeviceDelegationGateway: DeviceDelegationGateway = {
    async load(ownerId, deviceId) {
        if (deviceId !== currentDeviceId) {
            const previousId = currentDeviceId;
            currentDeviceId = deviceId;
            devices = devices.map(device => ({ ...device, id: device.id === previousId ? deviceId : device.id, isCurrent: device.id === previousId || device.id === deviceId }));
            delegatesByDevice[deviceId] = delegatesByDevice[previousId] ?? delegatesByDevice[deviceId] ?? [];
            if (previousId !== deviceId) delete delegatesByDevice[previousId];
        }
        devices = devices.map(device => ({ ...device, ownerId, isCurrent: device.id === currentDeviceId }));
        return wait({ devices: [...devices], delegatesByDevice: cloneDelegates(), friends: [...friends] });
    },
    async rename(deviceId, name) {
        devices = devices.map(device => device.id === deviceId ? { ...device, name: name.trim() } : device);
        notify();
        return wait(devices.find(device => device.id === deviceId)!);
    },
    async grant(deviceId, friendId) {
        const friend = friends.find(item => item.id === friendId);
        if (!friend) throw new Error('Friend not found.');
        if ((delegatesByDevice[deviceId] ?? []).some(delegate => delegate.userId === friendId)) throw new Error('This friend already has access.');
        const delegate = { deviceId, userId: friend.id, displayName: friend.displayName, email: friend.email, grantedAt: new Date().toISOString() };
        delegatesByDevice[deviceId] = [...(delegatesByDevice[deviceId] ?? []), delegate];
        notify();
        return wait(delegate);
    },
    async revoke(deviceId, friendId) {
        delegatesByDevice[deviceId] = (delegatesByDevice[deviceId] ?? []).filter(delegate => delegate.userId !== friendId);
        notify();
        return wait(undefined);
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
};

function cloneDelegates() { return Object.fromEntries(Object.entries(delegatesByDevice).map(([id, values]) => [id, [...values]])); }
