import { View } from 'react-native';
import YouTubePlayer from './YouTubePlayer';
import { usePlayer } from '../contexts/PlayerContext';

export default function PlayerEmbed() {
    const {
        videoId,
        playerRef,
        setPlayerReady,
        setPlayerState,
        setProgress,
    } = usePlayer();

    if (!videoId) return null;

    return (
        <View style={{ width: 80, height: 45, borderRadius: 4, overflow: 'hidden' }}>
            <YouTubePlayer
                ref={playerRef}
                videoId={videoId}
                compact
                onReady={() => setPlayerReady(true)}
                onStateChange={setPlayerState}
                onProgress={setProgress}
            />
        </View>
    );
}
