import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, DeviceMobile, Globe, PencilSimple, Plus, Trash, X } from 'phosphor-react-native';
import type { DeviceDelegate, EligibleFriend, PlaybackDevice } from '../lib/deviceDelegation.types';
import { colors, fonts, globalStyles, spacing } from '../styles';

type Props = { device: PlaybackDevice; delegates: DeviceDelegate[]; friends: EligibleFriend[]; operation: string | null; onRename: (name: string) => Promise<void>; onGrant: (friendId: string) => Promise<void>; onRevoke: (friendId: string) => Promise<void>; compact?: boolean };

export default function DeviceDelegationPanel({ device, delegates, friends, operation, onRename, onGrant, onRevoke, compact }: Props) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(device.name);
    const [showFriends, setShowFriends] = useState(false);
    const availableFriends = friends.filter(friend => !delegates.some(delegate => delegate.userId === friend.id));
    const saveName = async () => { if (name.trim() && name.trim() !== device.name) await onRename(name); setEditing(false); };
    return <View style={styles.card}>
        <View style={styles.row}>
            <View style={styles.deviceIcon}>{device.platform === 'web' ? <Globe size={22} color={colors.brand} /> : <DeviceMobile size={22} color={colors.brand} />}</View>
            <View style={{ flex: 1 }}>
                {editing ? <TextInput autoFocus value={name} onChangeText={setName} onSubmitEditing={() => void saveName()} style={styles.nameInput} /> : <Text style={globalStyles.heading}>{device.name}</Text>}
                <Text style={globalStyles.small}>{device.platform.toUpperCase()} · {device.isCurrent ? 'This device' : 'Registered device'}</Text>
            </View>
            {editing ? <Pressable onPress={() => void saveName()}><Check size={20} color={colors.brand} /></Pressable> : <Pressable onPress={() => { setName(device.name); setEditing(true); }}><PencilSimple size={19} color={colors.text.secondary} /></Pressable>}
        </View>
        <View style={styles.divider} />
        <Text style={styles.label}>People with playback control</Text>
        {!delegates.length ? <Text style={globalStyles.small}>No friends have access yet.</Text> : delegates.map(delegate => <View style={styles.delegateRow} key={delegate.userId}><View style={{ flex: 1 }}><Text style={globalStyles.bodyBold}>{delegate.displayName}</Text><Text style={globalStyles.small}>{delegate.email}</Text></View><Pressable disabled={Boolean(operation)} onPress={() => Alert.alert('Revoke access?', `${delegate.displayName} will no longer control this device.`, [{ text: 'Keep access', style: 'cancel' }, { text: 'Revoke', style: 'destructive', onPress: () => void onRevoke(delegate.userId) }])}><Trash size={19} color={colors.semantic.error} /></Pressable></View>)}
        {!compact ? <Pressable style={styles.addButton} disabled={Boolean(operation)} onPress={() => setShowFriends(true)}><Plus size={18} color={colors.text.primary} /><Text style={styles.addText}>Grant access to a friend</Text></Pressable> : null}
        <Modal visible={showFriends} transparent animationType="fade" onRequestClose={() => setShowFriends(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><Text style={globalStyles.heading}>Choose a friend</Text><Pressable onPress={() => setShowFriends(false)}><X size={21} color={colors.text.secondary} /></Pressable></View><Text style={[globalStyles.small, { marginBottom: spacing.md }]}>They will be able to control “{device.name}”.</Text>{availableFriends.length ? availableFriends.map(friend => <Pressable key={friend.id} style={styles.friendOption} onPress={() => { setShowFriends(false); void onGrant(friend.id); }}><View style={styles.avatar}><Text style={styles.avatarText}>{friend.displayName.slice(0, 1)}</Text></View><View><Text style={globalStyles.bodyBold}>{friend.displayName}</Text><Text style={globalStyles.small}>{friend.email}</Text></View></Pressable>) : <Text style={globalStyles.small}>All eligible friends already have access.</Text>}</View></View></Modal>
        {operation ? <ActivityIndicator style={styles.spinner} size="small" color={colors.brand} /> : null}
    </View>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.bg.card, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, deviceIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bg.elevated, alignItems: 'center', justifyContent: 'center' }, nameInput: { ...globalStyles.input, flex: 1, height: 40, marginBottom: 0, paddingHorizontal: spacing.md }, divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.gray, marginVertical: spacing.md }, label: { ...globalStyles.caption, marginBottom: spacing.sm }, delegateRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }, addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border.gray, borderRadius: 999, paddingVertical: spacing.sm, marginTop: spacing.md }, addText: { color: colors.text.primary, fontFamily: fonts.bodyBold, fontSize: 13 }, spinner: { position: 'absolute', right: spacing.lg, bottom: spacing.lg }, modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl }, modalCard: { backgroundColor: colors.bg.surface, borderRadius: 16, padding: spacing.xl }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }, friendOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.gray }, avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.text.primary, fontFamily: fonts.bodyBold } });
