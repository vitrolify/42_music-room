import { usePlayer } from '../contexts/PlayerContext';

const MINI_PLAYER_HEIGHT = 56;

export function usePlayerBarPadding(): number {
    const { videoId } = usePlayer();
    return videoId ? MINI_PLAYER_HEIGHT : 0;
}
