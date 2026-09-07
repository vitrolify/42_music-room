import { StyleSheet } from 'react-native';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { colors } from '../styles';
import type { YouTubePlayerHandle, YouTubePlayerProgress, YouTubePlayerState } from './YouTubePlayer.types';

export type PlayerCommand =
    | { type: 'load'; videoId: string }
    | { type: 'play' }
    | { type: 'pause' }
    | { type: 'seek'; seconds: number };

export const PROGRESS_UPDATE_INTERVAL_MS = 500;

export const playerContainerStyles = StyleSheet.create({
    container: {
        width: '100%',
        aspectRatio: 16 / 9,
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: colors.bg.card,
    },
});

export function useYouTubePlayerHandle(
    ref: Ref<YouTubePlayerHandle>,
    videoId: string,
    executeCommand: (command: PlayerCommand) => void,
) {
    const executeCommandRef = useRef(executeCommand);
    executeCommandRef.current = executeCommand;

    useImperativeHandle(ref, () => ({
        loadVideo: nextVideoId => executeCommandRef.current({ type: 'load', videoId: nextVideoId }),
        play: () => executeCommandRef.current({ type: 'play' }),
        pause: () => executeCommandRef.current({ type: 'pause' }),
        seekTo: seconds => executeCommandRef.current({ type: 'seek', seconds }),
    }), []);

    useEffect(() => {
        executeCommandRef.current({ type: 'load', videoId });
    }, [videoId]);
}

export function stateFromYouTubeCode(code: number): YouTubePlayerState | null {
    return ({ '-1': 'unstarted', '0': 'ended', '1': 'playing', '2': 'paused', '3': 'buffering', '5': 'cued' } as Record<string, YouTubePlayerState>)[String(code)] ?? null;
}

export function youtubeErrorMessage(code?: number) {
    if (code === 100) return 'This video was not found or is private.';
    if (code === 101 || code === 150) return 'This video does not allow embedded playback.';
    if (code === 153) return 'YouTube could not verify the player origin.';
    return 'YouTube could not play this video.';
}

export function readProgress(value: { currentTime?: unknown; duration?: unknown }): YouTubePlayerProgress {
    return {
        currentTime: readFiniteNumber(value.currentTime),
        duration: readFiniteNumber(value.duration),
    };
}

function readFiniteNumber(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
