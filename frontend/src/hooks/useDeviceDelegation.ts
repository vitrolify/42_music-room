import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDeviceId } from '../lib/deviceIdentity';
import { deviceDelegationApiGateway } from '../lib/deviceDelegation.api';
import { ApiError } from '../lib/api/client';
import type { DelegationLoadState, DelegationOperation, DeviceDelegate, EligibleFriend, PlaybackDevice } from '../lib/deviceDelegation.types';

export function useDeviceDelegation() {
    const { user } = useAuth();
    const [devices, setDevices] = useState<PlaybackDevice[]>([]);
    const [delegatesByDevice, setDelegatesByDevice] = useState<Record<string, DeviceDelegate[]>>({});
    const [friends, setFriends] = useState<EligibleFriend[]>([]);
    const [loadState, setLoadState] = useState<DelegationLoadState>('idle');
    const [operation, setOperation] = useState<DelegationOperation>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!user) return;
        setLoadState('loading'); setError(null);
        try {
            const deviceId = await getDeviceId();
            const snapshot = await deviceDelegationApiGateway.load(user.uid, deviceId);
            setDevices(snapshot.devices); setDelegatesByDevice(snapshot.delegatesByDevice); setFriends(snapshot.friends); setLoadState('ready');
        } catch (err) { setLoadState('error'); setError(formatDeviceError(err)); }
    }, [user]);

    useEffect(() => { void refresh(); return deviceDelegationApiGateway.subscribe(() => { void refresh(); }); }, [refresh]);

    const rename = useCallback(async (deviceId: string, name: string) => {
        setOperation('renaming'); setMessage(null); setError(null);
        try { await deviceDelegationApiGateway.rename(deviceId, name); await refresh(); setMessage('Device name updated.'); }
        catch (err) { setError(formatDeviceError(err)); }
        finally { setOperation(null); }
    }, [refresh]);
    const grant = useCallback(async (deviceId: string, friendId: string) => {
        setOperation('granting'); setMessage(null); setError(null);
        try { await deviceDelegationApiGateway.grant(deviceId, friendId); await refresh(); setMessage('Playback control granted.'); }
        catch (err) { setError(formatDeviceError(err)); }
        finally { setOperation(null); }
    }, [refresh]);
    const revoke = useCallback(async (deviceId: string, friendId: string) => {
        setOperation('revoking'); setMessage(null); setError(null);
        try { await deviceDelegationApiGateway.revoke(deviceId, friendId); await refresh(); setMessage('Access revoked.'); }
        catch (err) { setError(formatDeviceError(err)); }
        finally { setOperation(null); }
    }, [refresh]);

    return { devices, delegatesByDevice, friends, loadState, operation, message, error, refresh, rename, grant, revoke };
}

function formatDeviceError(error: unknown): string {
    if (!(error instanceof ApiError)) return error instanceof Error ? error.message : 'Network error. Check your connection and try again.';
    if (error.status === 401) return 'Your session expired. Sign in again to manage playback devices.';
    if (error.status === 403) return 'You do not have permission to manage this playback device.';
    if (error.status === 404) return 'The playback device or delegation could not be found.';
    if (error.status === 409 || error.errorCode?.toLowerCase().includes('duplicate')) return 'This friend already has access.';
    if (error.status >= 500) return 'The server could not update playback access. Try again.';
    return error.message || 'Unable to update playback access.';
}
