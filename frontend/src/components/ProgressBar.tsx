import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../styles';

type ProgressBarProps = {
    currentTime: number;
    duration: number;
    onSeek: (seconds: number) => void;
    variant?: 'full' | 'mini';
};

export default function ProgressBar({ currentTime, duration, onSeek, variant = 'full' }: ProgressBarProps) {
    const widthRef = useRef(0);
    const leftRef = useRef(0);
    const barRef = useRef<any>(null);
    const [draftTime, setDraftTime] = useState<number | null>(null);
    const [hovered, setHovered] = useState(false);

    const shownTime = draftTime ?? currentTime;
    const ratio = duration > 0 ? Math.min(Math.max(shownTime / duration, 0), 1) : 0;
    const isMini = variant === 'mini';

    const seekFromX = (x: number) => {
        if (!Number.isFinite(x) || widthRef.current <= 0 || duration <= 0) return;
        const seconds = Math.round((Math.min(Math.max(x, 0), widthRef.current) / widthRef.current) * duration);
        setDraftTime(seconds);
        return seconds;
    };

    const eventX = (event: { nativeEvent: { locationX?: number; pageX?: number; clientX?: number } }) => {
        const { locationX, pageX, clientX } = event.nativeEvent;
        const rect = barRef.current?.getBoundingClientRect?.();
        if (rect && typeof clientX === 'number' && Number.isFinite(clientX)) return clientX - rect.left;
        if (typeof locationX === 'number' && Number.isFinite(locationX)) return locationX;
        if (typeof pageX === 'number' && Number.isFinite(pageX)) return pageX - leftRef.current;
        return 0;
    };

    const barHeight = isMini ? 3 : 5;
    const thumbSize = isMini ? 10 : 12;
    const showThumb = Platform.OS === 'web' ? hovered : true;

    const hoverProps = Platform.OS === 'web'
        ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
        : {};

    return (
        <View {...hoverProps}>
            <Pressable
                ref={barRef}
                onPress={event => {
                    const seconds = seekFromX(eventX(event));
                    if (seconds !== undefined) onSeek(seconds);
                }}
                onLayout={event => {
                    widthRef.current = event.nativeEvent.layout.width;
                    event.currentTarget?.measureInWindow?.(x => { leftRef.current = x; });
                }}
                style={[styles.track, { height: isMini ? 20 : 28 }]}
            >
                <View style={[styles.trackInner, { height: barHeight, borderRadius: barHeight }]}>
                    <View style={[styles.fill, { width: `${ratio * 100}%`, height: barHeight, borderRadius: barHeight }]} />
                </View>
                {showThumb && (
                    <View
                        style={{
                            position: 'absolute',
                            left: `${ratio * 100}%`,
                            marginLeft: -(thumbSize / 2),
                            width: thumbSize,
                            height: thumbSize,
                            borderRadius: thumbSize / 2,
                            backgroundColor: colors.brand,
                        }}
                    />
                )}
            </Pressable>
            {!isMini && (
                <View style={styles.times}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Text style={styles.timeText}>{duration > 0 ? formatTime(duration) : '--:--'}</Text>
                </View>
            )}
        </View>
    );
}

export function formatTime(seconds: number) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
    track: {
        justifyContent: 'center',
    },
    trackInner: {
        backgroundColor: colors.bg.elevated,
    },
    fill: {
        backgroundColor: colors.brand,
    },
    times: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    timeText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.text.secondary,
    },
});
