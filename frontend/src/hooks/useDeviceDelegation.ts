import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDeviceId } from '../lib/deviceIdentity';
import { mockDeviceDelegationGateway } from '../lib/deviceDelegation.mock';
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
            const snapshot = await mockDeviceDelegationGateway.load(user.uid, deviceId);
            setDevices(snapshot.devices); setDelegatesByDevice(snapshot.delegatesByDevice); setFriends(snapshot.friends); setLoadState('ready');
        } catch (err) { setLoadState('error'); setError(err instanceof Error ? err.message : 'Unable to load devices.'); }
    }, [user]);

    useEffect(() => { void refresh(); return mockDeviceDelegationGateway.subscribe(() => { void refresh(); }); }, [refresh]);

    const rename = useCallback(async (deviceId: string, name: string) => {
        setOperation('renaming'); setMessage(null); setError(null);
        try { await mockDeviceDelegationGateway.rename(deviceId, name); await refresh(); setMessage('Device name updated.'); }
        catch (err) { setError(err instanceof Error ? err.message : 'Unable to rename device.'); }
        finally { setOperation(null); }
    }, [refresh]);
    const grant = useCallback(async (deviceId: string, friendId: string) => {
        setOperation('granting'); setMessage(null); setError(null);
        try { await mockDeviceDelegationGateway.grant(deviceId, friendId); await refresh(); setMessage('Playback control granted.'); }
        catch (err) { setError(err instanceof Error ? err.message : 'Unable to grant access.'); }
        finally { setOperation(null); }
    }, [refresh]);
    const revoke = useCallback(async (deviceId: string, friendId: string) => {
        setOperation('revoking'); setMessage(null); setError(null);
        try { await mockDeviceDelegationGateway.revoke(deviceId, friendId); await refresh(); setMessage('Access revoked.'); }
        catch (err) { setError(err instanceof Error ? err.message : 'Unable to revoke access.'); }
        finally { setOperation(null); }
    }, [refresh]);

    return { devices, delegatesByDevice, friends, loadState, operation, message, error, refresh, rename, grant, revoke };
}
