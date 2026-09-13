import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretDown, Check, DeviceMobile, X } from 'phosphor-react-native';
import type { PlaybackSession } from '../lib/api/playback.types';
import { colors, globalStyles, spacing } from '../styles';

type Props = {
    sessions: PlaybackSession[];
    selectedOwnerId: string | null;
    onSelect: (ownerId: string | null) => void | Promise<void>;
    compact?: boolean;
};

function statusLabel(session: PlaybackSession) {
    return session.status === 'playing' ? 'Tocando' : 'Pausado';
}

export default function PlaybackSessionPicker({ sessions, selectedOwnerId, onSelect, compact = false }: Props) {
    const [visible, setVisible] = useState(false);
    const selected = useMemo(
        () => sessions.find(session => session.shared ? session.owner_id === selectedOwnerId : selectedOwnerId === null),
        [selectedOwnerId, sessions],
    );

    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose playback session"
                onPress={event => { event.stopPropagation?.(); setVisible(true); }}
                style={[styles.trigger, compact && styles.compactTrigger]}
            >
                <DeviceMobile size={compact ? 16 : 20} color={colors.text.secondary} />
                {!compact && <Text style={styles.triggerText} numberOfLines={1}>{selected?.shared ? selected.owner_name ?? 'Shared playback' : 'Seu playback'}</Text>}
                <CaretDown size={compact ? 13 : 16} color={colors.text.secondary} />
            </Pressable>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
                <View style={styles.backdrop}>
                    <View style={styles.sheet}>
                        <View style={styles.header}>
                            <Text style={globalStyles.heading}>Playback</Text>
                            <Pressable accessibilityLabel="Close" onPress={() => setVisible(false)} hitSlop={10}><X size={22} color={colors.text.secondary} /></Pressable>
                        </View>
                        <Text style={[globalStyles.small, { marginBottom: spacing.md }]}>Escolha onde continuar ouvindo.</Text>
                        {sessions.map(session => {
                            const isSelected = session.shared ? selectedOwnerId === session.owner_id : selectedOwnerId === null;
                            return (
                                <Pressable
                                    key={session.shared ? session.session_id : 'own-playback'}
                                    style={[styles.option, isSelected && styles.selectedOption]}
                                    onPress={() => { setVisible(false); void onSelect(session.shared ? session.owner_id : null); }}
                                >
                                    <View style={styles.optionIcon}><DeviceMobile size={20} color={isSelected ? colors.brand : colors.text.secondary} /></View>
                                    <View style={styles.optionBody}>
                                        <Text style={globalStyles.bodyBold}>{session.shared ? session.owner_name ?? 'Playback compartilhado' : 'Seu playback'}</Text>
                                        <Text style={globalStyles.small}>{session.controller_device_name ?? 'Este dispositivo'} · {statusLabel(session)}</Text>
                                        {session.track ? <Text style={styles.track} numberOfLines={1}>{session.track.title ?? session.track.video_id}</Text> : null}
                                    </View>
                                    {isSelected ? <Check size={20} color={colors.brand} weight="bold" /> : null}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
    sheet: { backgroundColor: colors.bg.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: spacing.xl, maxHeight: '85%' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
    trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 120, maxWidth: 220, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 999, backgroundColor: colors.bg.card },
    compactTrigger: { minWidth: 50, width: 50, height: 36, justifyContent: 'center', paddingHorizontal: spacing.sm, gap: 2 },
    triggerText: { flex: 1, color: colors.text.secondary, fontSize: 11 },
    option: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 10, marginTop: spacing.xs, gap: spacing.md },
    selectedOption: { backgroundColor: colors.bg.elevated },
    optionIcon: { width: 30, alignItems: 'center' },
    optionBody: { flex: 1, minWidth: 0 },
    track: { color: colors.text.primary, fontSize: 12, marginTop: 2 },
});
