import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useDeviceDelegation } from '../hooks/useDeviceDelegation';
import { usePlayer } from '../contexts/PlayerContext';
import DeviceDelegationPanel from './DeviceDelegationPanel';
import { colors, globalStyles, spacing } from '../styles';
import { useAuth } from '../contexts/AuthContext';

export default function PlayerDelegationCard() {
    const { activePlaylistId, controllerDeviceId } = usePlayer();
    const { user } = useAuth();
    const delegation = useDeviceDelegation();
    if (activePlaylistId === null) return null;
    if (delegation.loadState === 'loading' || delegation.loadState === 'idle') return <ActivityIndicator color={colors.brand} />;
    if (delegation.loadState === 'error') return <Text style={globalStyles.errorText}>{delegation.error}</Text>;
    const device = delegation.devices.find(item => item.id === controllerDeviceId) ?? delegation.devices.find(item => item.isCurrent);
    if (!device) return null;
    const isOwner = device.ownerId === user?.uid;
    return <View style={styles.wrapper}><Text style={globalStyles.heading}>Share playback control</Text><Text style={[globalStyles.small, { marginTop: spacing.xs, marginBottom: spacing.md }]}>{isOwner ? 'Give a friend control of your device while this playlist is playing.' : 'This playback is controlled by a device owned by another user.'}</Text>{isOwner ? <DeviceDelegationPanel device={device} delegates={delegation.delegatesByDevice[device.id] ?? []} friends={delegation.friends} operation={delegation.operation} onRename={(name) => delegation.rename(device.id, name)} onGrant={id => delegation.grant(device.id, id)} onRevoke={id => delegation.revoke(device.id, id)} /> : null}</View>;
}
const styles = StyleSheet.create({ wrapper: { marginTop: spacing.xxl, width: '100%' }, });
