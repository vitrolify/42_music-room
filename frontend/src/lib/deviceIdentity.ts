import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getAuthUserId } from './firebase';

const LEGACY_STORAGE_KEY = 'vitrolify.device-id.v1';
const cachedDeviceIds = new Map<string, string>();
const nativeDeviceIdPromises = new Map<string, Promise<string>>();

function newUuid(): string {
    return globalThis.crypto?.randomUUID?.()
        ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const value = Math.floor(Math.random() * 16);
            return (c === 'x' ? value : (value & 0x3) | 0x8).toString(16);
        });
}

function resolveUserId(userId?: string | null): string | null {
    if (userId) return userId;
    try {
        return getAuthUserId();
    } catch {
        return null;
    }
}

function getStorageKey(userId?: string | null): string {
    if (userId) {
        const sanitized = userId.replace(/[^a-zA-Z0-9._-]/g, '_');
        return `vitrolify.device-id.v1.${sanitized}`;
    }
    return 'vitrolify.device-id.v1.anon';
}

/** Reset in-memory cached device IDs (useful on logout / account switch). */
export function resetDeviceIdCache(): void {
    cachedDeviceIds.clear();
    nativeDeviceIdPromises.clear();
}

/** Clear stored and cached device ID for a specific user. */
export async function clearDeviceId(userId?: string | null): Promise<void> {
    const uid = resolveUserId(userId);
    const cacheKey = uid ?? 'anon';
    const storageKey = getStorageKey(uid);

    cachedDeviceIds.delete(cacheKey);
    nativeDeviceIdPromises.delete(cacheKey);

    if (Platform.OS === 'web') {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(storageKey);
                localStorage.removeItem(LEGACY_STORAGE_KEY);
            }
        } catch (e) {
            console.warn('Failed to remove deviceId from localStorage:', e);
        }
        return;
    }

    try {
        await SecureStore.deleteItemAsync(storageKey);
        await SecureStore.deleteItemAsync(LEGACY_STORAGE_KEY).catch(() => undefined);
    } catch (e) {
        console.warn('Failed to delete deviceId from SecureStore:', e);
    }
}

/** One stable ID per user account on this device / browser installation. */
export async function getDeviceId(userId?: string | null, forceNew = false): Promise<string> {
    const uid = resolveUserId(userId);
    const cacheKey = uid ?? 'anon';
    const storageKey = getStorageKey(uid);

    if (!forceNew) {
        const cached = cachedDeviceIds.get(cacheKey);
        if (cached) {
            return cached;
        }
    }

    if (Platform.OS === 'web') {
        try {
            if (typeof localStorage !== 'undefined') {
                if (!forceNew) {
                    const existing = localStorage.getItem(storageKey);
                    if (existing) {
                        cachedDeviceIds.set(cacheKey, existing);
                        return existing;
                    }
                }
                const created = newUuid();
                try {
                    localStorage.setItem(storageKey, created);
                    if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
                        localStorage.removeItem(LEGACY_STORAGE_KEY);
                    }
                } catch (e) {
                    console.warn('Failed to persist deviceId in localStorage:', e);
                }
                cachedDeviceIds.set(cacheKey, created);
                return created;
            }
        } catch (e) {
            console.warn('Failed to access localStorage for deviceId:', e);
        }
        const fallback = newUuid();
        cachedDeviceIds.set(cacheKey, fallback);
        return fallback;
    }

    if (forceNew) {
        nativeDeviceIdPromises.delete(cacheKey);
    }

    let promise = nativeDeviceIdPromises.get(cacheKey);
    if (!promise) {
        promise = (async () => {
            try {
                if (!forceNew) {
                    const existing = await SecureStore.getItemAsync(storageKey);
                    if (existing) {
                        cachedDeviceIds.set(cacheKey, existing);
                        return existing;
                    }
                }

                const created = newUuid();
                try {
                    await SecureStore.setItemAsync(storageKey, created);
                    await SecureStore.deleteItemAsync(LEGACY_STORAGE_KEY).catch(() => undefined);
                } catch (e) {
                    console.warn('Failed to persist deviceId in SecureStore:', e);
                }
                cachedDeviceIds.set(cacheKey, created);
                return created;
            } catch (e) {
                console.warn('Failed to read deviceId from SecureStore:', e);
                nativeDeviceIdPromises.delete(cacheKey);
                const fallback = cachedDeviceIds.get(cacheKey) ?? newUuid();
                cachedDeviceIds.set(cacheKey, fallback);
                return fallback;
            }
        })();
        nativeDeviceIdPromises.set(cacheKey, promise);
    }

    try {
        const id = await promise;
        cachedDeviceIds.set(cacheKey, id);
        return id;
    } catch {
        nativeDeviceIdPromises.delete(cacheKey);
        const fallback = cachedDeviceIds.get(cacheKey) ?? newUuid();
        cachedDeviceIds.set(cacheKey, fallback);
        return fallback;
    }
}

export async function registerCurrentDevice(userId?: string | null): Promise<string> {
    const id = await getDeviceId(userId);
    const { request } = await import('./api/client');
    const deviceName = Platform.OS === 'web' ? 'Web browser' : `${Platform.OS} device`;

    try {
        await request('POST', '/devices/', {
            id,
            name: deviceName,
        });
        return id;
    } catch (error: any) {
        const isForeignDevice =
            error?.status === 403
            || error?.errorCode === 'FOREIGN_DEVICE'
            || (typeof error?.message === 'string' && error.message.includes('another user'));

        if (isForeignDevice) {
            console.warn('Device ID is registered to another user; regenerating fresh device ID...');
            await clearDeviceId(userId);
            const freshId = await getDeviceId(userId, true);
            await request('POST', '/devices/', {
                id: freshId,
                name: deviceName,
            });
            return freshId;
        }

        throw error;
    }
}
