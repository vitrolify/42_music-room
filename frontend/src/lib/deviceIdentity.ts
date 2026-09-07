import { Platform } from 'react-native';

const STORAGE_KEY = 'vitrolify.device-id.v1';
let nativeDeviceId: string | null = null;

function newUuid(): string {
    return globalThis.crypto?.randomUUID?.()
        ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const value = Math.floor(Math.random() * 16);
            return (c === 'x' ? value : (value & 0x3) | 0x8).toString(16);
        });
}

/** One stable ID per browser profile or native installation. */
export async function getDeviceId(): Promise<string> {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const existing = localStorage.getItem(STORAGE_KEY);
        if (existing) return existing;
        const created = newUuid();
        localStorage.setItem(STORAGE_KEY, created);
        return created;
    }

    // Native builds retain this value for the lifetime of the installed app. A native
    // secure-store adapter can be supplied without changing callers.
    if (!nativeDeviceId) nativeDeviceId = newUuid();
    return nativeDeviceId;
}

export async function registerCurrentDevice(): Promise<string> {
    const id = await getDeviceId();
    const { request } = await import('./api/client');
    await request('POST', '/devices/', {
        id,
        name: Platform.OS === 'web' ? 'Web browser' : `${Platform.OS} device`,
    });
    return id;
}
