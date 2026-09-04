import { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	TextInput,
	View,
	Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
	addPlaylistTrack,
	getPlaylist,
	listPlaylistTracks,
	movePlaylistTrack,
	playPlaylistTrack,
	pausePlaylistTrack,
	skipPlaylistTrack,
	deletePlaylistTrack,
	getFirebaseToken,
	getPlaylistWebSocketUrl,
	ApiError,
	type Playlist,
	type PlaylistTrack,
} from '../../../src/lib/api';
import { colors, globalStyles, spacing } from '../../../src/styles';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function PlaylistDetail() {
	const { user } = useAuth();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams<{ id: string }>();
	const playlistId = Number(id);

	const [playlist, setPlaylist] = useState<Playlist | null>(null);
	const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
	const [trackInfoId, setTrackInfoId] = useState('');
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [mutating, setMutating] = useState(false);
	const [mutationMessage, setMutationMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'offline'>('connecting');
	const socketRef = useRef<WebSocket | null>(null);
	const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttempt = useRef(0);

	const isValidPlaylistId = Number.isInteger(playlistId) && playlistId > 0;
	const canAddTrack = isValidPlaylistId && trackInfoId.trim().length > 0 && !mutating;

	const fetchData = useCallback(async () => {
		if (!isValidPlaylistId) {
			setError('Invalid playlist id.');
			return;
		}

		try {
			setError(null);
			const [nextPlaylist, nextTracks] = await Promise.all([
				getPlaylist(playlistId),
				listPlaylistTracks(playlistId),
			]);
			setPlaylist(nextPlaylist);
			setTracks(nextTracks);
		} catch (err) {
			const message = getPlaylistTrackLoadErrorMessage(err);
			setError(message);
		}
	}, [isValidPlaylistId, playlistId]);

	useEffect(() => {
		(async () => {
			setLoading(true);
			await fetchData();
			setLoading(false);
		})();
	}, [fetchData]);

	useEffect(() => {
		let active = true;
		async function connect() {
			if (!isValidPlaylistId) return;
			const token = await getFirebaseToken();
			if (!active || !token) { setConnectionState('offline'); return; }
			setConnectionState('connecting');
			const deviceId = user?.displayName || 'anonymous';
			const socket = new WebSocket(getPlaylistWebSocketUrl(playlistId, token, deviceId));
			socketRef.current = socket;
			socket.onopen = () => { reconnectAttempt.current = 0; setConnectionState('connected'); void fetchData(); };
			socket.onmessage = message => {
				try {
					const event = JSON.parse(message.data) as { type?: string };
					if (['TRACK_ADDED', 'TRACK_MOVED', 'TRACK_DELETED', 'TRACK_PLAYING', 'TRACK_PAUSED', 'TRACK_SKIPPED'].includes(event.type ?? '')) {
						void fetchData();
					}
				} catch { /* Ignore malformed broadcasts. */ }
			};
			socket.onerror = () => setConnectionState('offline');
			socket.onclose = () => {
				if (!active) return;
				setConnectionState('offline');
				const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 10000);
				reconnectAttempt.current += 1;
				reconnectTimer.current = setTimeout(() => void connect(), delay);
			};
		}
		void connect();
		return () => {
			active = false;
			if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
			socketRef.current?.close();
			socketRef.current = null;
		};
	}, [fetchData, isValidPlaylistId, playlistId]);

	async function handleRefresh() {
		setRefreshing(true);
		await fetchData();
		setRefreshing(false);
	}

	async function refreshTracksAfterMutation(
		hasExpectedChange: (nextTracks: PlaylistTrack[]) => boolean,
		unchangedMessage: string,
	) {
		await sleep(500);

		for (let attempt = 0; attempt < 3; attempt += 1) {
			const nextTracks = await listPlaylistTracks(playlistId);
			setTracks(nextTracks);

			if (hasExpectedChange(nextTracks)) return;

			await sleep(500);
		}

		Alert.alert('Still processing', unchangedMessage);
	}

	async function handleAddTrack() {
		const trimmedTrackInfoId = trackInfoId.trim();
		if (!isValidPlaylistId) {
			Alert.alert('Error', 'Invalid playlist id.');
			return;
		}
		if (!trimmedTrackInfoId || mutating) return;

		setMutating(true);
		setMutationMessage('Adding track...');
		try {
			const previousTrackCount = tracks.length;
			await addPlaylistTrack(playlistId, trimmedTrackInfoId);
			setTrackInfoId('');
			await refreshTracksAfterMutation(
				nextTracks => nextTracks.length > previousTrackCount,
				'The add request was accepted, but the track has not appeared yet. Refresh and try again if it does not show up.',
			);
		} catch (err) {
			Alert.alert('Error', getPlaylistTrackMutationErrorMessage(err, 'add track'));
		} finally {
			setMutationMessage(null);
			setMutating(false);
		}
	}

	async function handleMoveTrack(track: PlaylistTrack, newPosition: number) {
		if (mutating) return;
		if (!isValidPlaylistId) {
			Alert.alert('Error', 'Invalid playlist id.');
			return;
		}
		if (newPosition < 1 || newPosition > tracks.length) {
			Alert.alert('Error', 'Track position is out of range.');
			return;
		}
		if (track.position === newPosition) return;

		setMutating(true);
		setMutationMessage('Moving track...');
		try {
			await movePlaylistTrack(playlistId, track, newPosition);
			await refreshTracksAfterMutation(
				nextTracks => nextTracks.some(nextTrack => (
					nextTrack.id === track.id && nextTrack.position === newPosition
				)),
				'The move request was accepted, but the order did not change yet. Refresh and retry if the list stays the same.',
			);
		} catch (err) {
			Alert.alert('Error', getPlaylistTrackMutationErrorMessage(err, 'move track'));
		} finally {
			setMutationMessage(null);
			setMutating(false);
		}
	}

	if (loading) {
		return (
			<View style={[globalStyles.container, { paddingTop: insets.top + spacing.xl }]}>
				<ActivityIndicator size="large" color={colors.brand} />
			</View>
		);
	}

	return (
		<ScrollView
			style={[globalStyles.screen, { paddingTop: insets.top + spacing.xl }]}
			contentContainerStyle={{
				padding: spacing.xl,
				paddingBottom: insets.bottom + spacing.xxl,
			}}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={handleRefresh}
					tintColor={colors.brand}
				/>
			}
		>
			<View style={{ marginBottom: spacing.xl }}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
					<Pressable
						onPress={() => router.back()}
						style={({ pressed }) => ({
							opacity: pressed ? 0.7 : 1,
						})}
					>
						<Text style={globalStyles.link}>Back</Text>
					</Pressable>
					<Pressable
						onPress={handleRefresh}
						disabled={refreshing || mutating || !isValidPlaylistId}
						style={({ pressed }) => ({
							opacity: pressed || refreshing || mutating || !isValidPlaylistId ? 0.55 : 1,
						})}
					>
						<Text style={globalStyles.link}>Refresh</Text>
					</Pressable>
				</View>
				<Text style={globalStyles.title}>{playlist?.name ?? 'Playlist'}</Text>
				<Text style={[globalStyles.small, { marginTop: spacing.xs }]}>Tracks</Text>
				{mutationMessage ? (
					<Text style={[globalStyles.small, { color: colors.brand, marginTop: spacing.xs }]}>
						{mutationMessage}
					</Text>
				) : null}
			</View>

			{error ? (
				<View style={cardStyle}>
					<Text style={globalStyles.errorText}>{error}</Text>
					<Pressable
						style={({ pressed }) => ({
							...globalStyles.primaryPillButton,
							opacity: pressed ? 0.8 : 1,
						})}
						onPress={fetchData}
					>
						<Text style={globalStyles.primaryPillButtonText}>Retry</Text>
					</Pressable>
				</View>
			) : (
				<>
					<View style={[cardStyle, { marginBottom: spacing.xl }]}>
						<Text style={[globalStyles.heading, { marginBottom: spacing.md }]}>Add Track</Text>
						<TextInput
							style={globalStyles.input}
							value={trackInfoId}
							onChangeText={setTrackInfoId}
							placeholder="YouTube ID or URL"
							placeholderTextColor={colors.text.secondary}
							autoCapitalize="none"
							autoCorrect={false}
							editable={!mutating && isValidPlaylistId}
						/>
						<Pressable
							style={({ pressed }) => ({
								...globalStyles.primaryPillButton,
								opacity: pressed || !canAddTrack ? 0.7 : 1,
							})}
							onPress={handleAddTrack}
							disabled={!canAddTrack}
						>
							{mutating ? (
								<ActivityIndicator size="small" color={colors.text.primary} />
							) : (
								<Text style={globalStyles.primaryPillButtonText}>Add</Text>
							)}
						</Pressable>
					</View>

					{tracks.length === 0 ? (
						<View style={cardStyle}>
							<Text style={[globalStyles.heading, { marginBottom: spacing.sm }]}>No tracks yet</Text>
							<Text style={globalStyles.secondaryText}>Add a track id to start building this playlist.</Text>
						</View>
					) : (
						<View style={{ gap: spacing.sm }}>
							{tracks.map(track => (
								<TrackRow
									key={track.id}
									track={track}
									isFirst={track.position === 0}
									isLast={track.position === tracks.length - 1}
									disabled={mutating}
									onMove={handleMoveTrack}
									onAction={async action => {
										if (action === 'delete' && track.position === 0) return;
										if (action === 'delete') {
											const confirmed = await new Promise<boolean>(resolve => {
												Alert.alert('Delete track?', 'This removes the queued track from the playlist.', [
													{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
													{ text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
												]);
											});
											if (!confirmed) return;
										}
										setMutating(true);
										setMutationMessage(`${action[0].toUpperCase()}${action.slice(1)} track...`);
										try {
											if (action === 'play') await playPlaylistTrack(playlistId, track);
											if (action === 'pause') await pausePlaylistTrack(playlistId, track);
											if (action === 'skip') await skipPlaylistTrack(playlistId, track);
											if (action === 'delete') await deletePlaylistTrack(playlistId, track);
											await refreshTracksAfterMutation(
												nextTracks => {
													if (action === 'delete') {
														return !nextTracks.some(nextTrack => nextTrack.id === track.id);
													}
													if (action === 'skip') {
														return nextTracks[0]?.id !== track.id;
													}
													const updatedTrack = nextTracks.find(nextTrack => nextTrack.id === track.id);
													return action === 'play'
														? updatedTrack?.status === 'playing'
														: updatedTrack?.status === 'paused';
												},
												`The ${action} request was accepted, but the queue has not updated yet. Refresh and try again if it stays unchanged.`,
											);
										} catch (err) {
											Alert.alert('Error', getPlaylistTrackMutationErrorMessage(err, `${action} track`));
										} finally { setMutationMessage(null); setMutating(false); }
									}}
								/>
							))}
						</View>
					)}
				</>
			)}
		</ScrollView>
	);
}

type TrackRowProps = {
	track: PlaylistTrack;
	isFirst: boolean;
	isLast: boolean;
	disabled: boolean;
	onMove: (track: PlaylistTrack, newPosition: number) => void;
	onAction: (action: 'play' | 'pause' | 'skip' | 'delete') => void;
};

function TrackRow({ track, isFirst, isLast, disabled, onMove, onAction }: TrackRowProps) {
	return (
		<View style={cardStyle}>
			<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
				<View style={{ flex: 1, marginRight: spacing.md }}>
					<Text style={globalStyles.bodyBold} numberOfLines={1}>
						{track.position}. {track.track_info.title || track.track_info_id || 'Unknown track'}
					</Text>
					{track.track_info.channel_title ? <Text style={globalStyles.small}>{track.track_info.channel_title}</Text> : null}
					{track.track_info.thumbnail_url ? <Image source={{ uri: track.track_info.thumbnail_url }} style={{ width: 64, height: 36, marginTop: spacing.xs }} /> : null}
					{track.track_info.duration_seconds != null ? <Text style={globalStyles.small}>Duration: {formatDuration(track.track_info.duration_seconds)}</Text> : null}
					<Text style={globalStyles.small}>Status: {track.status}</Text>
				</View>
				<View style={{ flexDirection: 'row', gap: spacing.sm }}>
					<MoveButton
						label="Up"
						disabled={disabled || isFirst}
						onPress={() => onMove(track, track.position - 1)}
					/>
					<MoveButton
						label="Down"
						disabled={disabled || isLast}
						onPress={() => onMove(track, track.position + 1)}
					/>
				</View>
			</View>
			<View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
				{isFirst && track.status !== 'playing' ? <MoveButton label="Play" disabled={disabled} onPress={() => onAction('play')} /> : null}
				{isFirst && track.status === 'playing' ? <MoveButton label="Pause" disabled={disabled} onPress={() => onAction('pause')} /> : null}
				{isFirst ? <MoveButton label="Skip" disabled={disabled} onPress={() => onAction('skip')} /> : null}
				{!isFirst && track.status === 'queued' ? <MoveButton label="Delete" disabled={disabled} onPress={() => onAction('delete')} /> : null}
			</View>
		</View>
	);
}

type MoveButtonProps = {
	label: string;
	disabled: boolean;
	onPress: () => void;
};

function MoveButton({ label, disabled, onPress }: MoveButtonProps) {
	return (
		<Pressable
			style={({ pressed }) => ({
				...globalStyles.pillButton,
				paddingHorizontal: spacing.md,
				opacity: disabled || pressed ? 0.55 : 1,
			})}
			onPress={onPress}
			disabled={disabled}
		>
			<Text style={[globalStyles.pillButtonText, { fontSize: 11 }]}>{label}</Text>
		</Pressable>
	);
}

const cardStyle = {
	backgroundColor: colors.bg.card,
	borderRadius: 8,
	padding: spacing.lg,
} as const;

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function getPlaylistTrackLoadErrorMessage(error: unknown) {
	if (error instanceof ApiError) {
		if (error.errorCode === 'PLAYLIST_NOT_FOUND') return 'Playlist not found.';
		if (error.errorCode === 'FORBIDDEN') return 'You do not have permission to view this playlist.';
		if (error.errorCode === 'AUTH_TOKEN_MISSING') return 'Please sign in again.';
		if (error.errorCode === 'VALIDATION_ERROR') return 'This playlist request is invalid.';
	}

	return error instanceof Error ? error.message : 'Failed to load playlist tracks';
}

function getPlaylistTrackMutationErrorMessage(error: unknown, action: string) {
	if (error instanceof ApiError) {
		if (error.errorCode === 'PLAYLIST_NOT_FOUND') return 'Playlist not found.';
		if (error.errorCode === 'FORBIDDEN') return 'You do not have permission to edit this playlist.';
		if (error.errorCode === 'AUTH_TOKEN_MISSING') return 'Please sign in again.';
		if (error.errorCode === 'VALIDATION_ERROR') return 'Track update request is invalid.';
	}

	return error instanceof Error ? error.message : `Failed to ${action}`;
}
