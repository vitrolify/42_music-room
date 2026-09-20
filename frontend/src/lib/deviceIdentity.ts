import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'vitrolify.device-id.v1';
let cachedDeviceId: string | null = null;
let nativeDeviceIdPromise: Promise<string> | null = null;

function newUuid(): string {
    return globalThis.crypto?.randomUUID?.()
        ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const value = Math.floor(Math.random() * 16);
            return (c === 'x' ? value : (value & 0x3) | 0x8).toString(16);
        });
}

/** One stable ID per browser profile or native installation. */
export async function getDeviceId(): Promise<string> {
    if (cachedDeviceId) {
        return cachedDeviceId;
    }

    if (Platform.OS === 'web') {
        try {
            if (typeof localStorage !== 'undefined') {
                const existing = localStorage.getItem(STORAGE_KEY);
                if (existing) {
                    cachedDeviceId = existing;
                    return existing;
                }
                const created = newUuid();
                try {
                    localStorage.setItem(STORAGE_KEY, created);
                } catch (e) {
                    console.warn('Failed to persist deviceId in localStorage:', e);
                }
                cachedDeviceId = created;
                return created;
            }
        } catch (e) {
            console.warn('Failed to access localStorage for deviceId:', e);
        }
        cachedDeviceId = newUuid();
        return cachedDeviceId;
    }

    if (!nativeDeviceIdPromise) {
        nativeDeviceIdPromise = (async () => {
            try {
                const existing = await SecureStore.getItemAsync(STORAGE_KEY);
                if (existing) {
                    cachedDeviceId = existing;
                    return existing;
                }

                const created = newUuid();
                try {
                    await SecureStore.setItemAsync(STORAGE_KEY, created);
                } catch (e) {
                    console.warn('Failed to persist deviceId in SecureStore:', e);
                }
                cachedDeviceId = created;
                return created;
            } catch (e) {
                console.warn('Failed to read deviceId from SecureStore:', e);
                nativeDeviceIdPromise = null;
                const fallback = cachedDeviceId ?? newUuid();
                cachedDeviceId = fallback;
                return fallback;
            }
        })();
    }

    try {
        const id = await nativeDeviceIdPromise;
        cachedDeviceId = id;
        return id;
    } catch {
        nativeDeviceIdPromise = null;
        const fallback = cachedDeviceId ?? newUuid();
        cachedDeviceId = fallback;
        return fallback;
    }
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
