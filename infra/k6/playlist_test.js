import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

// Create custom counters for each event type
const addCounter = new Counter("event_add");
const moveCounter = new Counter("event_move");
const skipCounter = new Counter("event_skip");
const deleteCounter = new Counter("event_delete");

const PLAYLIST_COUNT = __ENV.PLAYLIST_COUNT
  ? parseInt(__ENV.PLAYLIST_COUNT)
  : 3;
const PARTICIPANTS_PER_PLAYLIST = __ENV.PARTICIPANTS
  ? parseInt(__ENV.PARTICIPANTS)
  : 4;
const USERS_PER_PLAYLIST = PARTICIPANTS_PER_PLAYLIST + 1;

export const options = {
  vus: PLAYLIST_COUNT * USERS_PER_PLAYLIST,
  duration: "45s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    ws_session_duration: ["p(95)>20000"],
  },
};

const BASE_URL = __ENV.K6_API_BASE_URL || "http://localhost:8000";
const WS_BASE_URL = BASE_URL.replace("http", "ws");

// ------------------------------------------------------------------
// 2. Setup: Pre-create Playlists
// ------------------------------------------------------------------
export function setup() {
  const playlists = [];

  for (let i = 0; i < PLAYLIST_COUNT; i++) {
    const hostToken = `host-user-playlist-${i}`;
    const payload = JSON.stringify({
      name: `Active Playlist ${i} - ${Date.now()}`,
      public: true,
      invited_only_edit: false,
    });

    const res = http.post(`${BASE_URL}/api/v1/playlists`, payload, {
      headers: {
        Authorization: `Bearer ${hostToken}`,
        "Content-Type": "application/json",
      },
    });

    const playlistId = JSON.parse(res.body).id;
    playlists.push({ playlistId: playlistId, hostToken: hostToken });
  }

  return { playlists };
}

// ------------------------------------------------------------------
// 3. Helper: Generate random YouTube IDs
// ------------------------------------------------------------------
function getRandomVideo() {
  const vids = ["dQw4w9WgXcQ", "jNQXAC9IVRw", "kJQP7kiw5Fk", "9bZkp7q19f0"];
  return vids[Math.floor(Math.random() * vids.length)];
}

// ------------------------------------------------------------------
// 4. Main Execution: State Management & Active Interaction
// ------------------------------------------------------------------
export default function (data) {
  const userZeroIndex = __VU - 1;
  const playlistIndex = Math.floor(userZeroIndex / USERS_PER_PLAYLIST);
  const isHost = userZeroIndex % USERS_PER_PLAYLIST === 0;

  const playlistData = data.playlists[playlistIndex];
  const playlistId = playlistData.playlistId;
  const token = isHost ? playlistData.hostToken : `participant-user-${__VU}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Local state for this specific VU
  let playlistState = [];

  // Helper to keep local state sorted by position
  const sortState = () => {
    playlistState.sort((a, b) => a.position - b.position);
  };

  const wsUrl = `${WS_BASE_URL}/ws/playlists/${playlistId}`;

  const wsParams = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const wsRes = ws.connect(wsUrl, wsParams, function (socket) {
    // --- WEBSOCKET EVENT LISTENER (STATE UPDATES) ---
    socket.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);

        if (data.type === "TRACK_ADDED") {
          playlistState.push({
            id: data.payload.playlist_track_id,
            position: data.payload.position,
            status: data.payload.status,
          });
          sortState();
        } else if (data.type === "TRACK_MOVED") {
          const track = playlistState.find(
            (t) => t.id === data.payload.playlist_track_id,
          );
          if (track) {
            track.position = data.payload.new_position;
            sortState();
          }
        } else if (data.type === "TRACK_DELETED") {
          playlistState = playlistState.filter(
            (t) => t.id !== data.payload.playlist_track_id,
          );
        } else if (data.type === "TRACK_SKIPPED") {
          if (playlistState.length > 0) playlistState.shift();
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    // --- ACTION LOOP (TRIGGERING EVENTS) ---
    socket.on("open", () => {
      socket.setInterval(function () {
        const stateCount = playlistState.length;
        let eventPayload = null;

        if (isHost) {
          if (stateCount > 0) {
            const action = Math.random() > 0.5 ? "skip" : "delete";
            const randomTrack =
              playlistState[Math.floor(Math.random() * stateCount)];
            const playingTrack = playlistState[0];

            if (action === "skip" && playingTrack) {
              eventPayload = {
                event: "skip",
                playlist_track_id: playingTrack.id,
              };
            } else if (action === "delete") {
              eventPayload = {
                event: "delete",
                playlist_track_id: randomTrack.id,
              };
            }
          } else {
            eventPayload = {
              event: "add",
              track_info_id: getRandomVideo(),
            };
          }
        } else {
          if (stateCount > 1 && Math.random() > 0.6) {
            const randomTrack =
              playlistState[Math.floor(Math.random() * stateCount)];
            const newPos = Math.floor(Math.random() * stateCount);
            eventPayload = {
              event: "move",
              playlist_track_id: randomTrack.id,
              current_position: randomTrack.position,
              new_position: newPos,
            };
          } else {
            eventPayload = {
              event: "add",
              track_info_id: getRandomVideo(),
            };
          }
        }

        if (eventPayload) {
          const res = http.post(
            `${BASE_URL}/api/v1/playlists/${playlistId}/events`,
            JSON.stringify(eventPayload),
            { headers },
          );

          if (res.status === 200 || res.status === 201 || res.status === 202) {
            if (eventPayload.event === "add") addCounter.add(1);
            if (eventPayload.event === "move") moveCounter.add(1);
            if (eventPayload.event === "skip") skipCounter.add(1);
            if (eventPayload.event === "delete") deleteCounter.add(1);
          }
        }
      }, 3000);
    });

    socket.on("error", (e) => {
      if (e.error() != "websocket: close sent") {
        console.error(`VU ${__VU} WS Error: ${e.error()}`);
      }
    });

    socket.setTimeout(function () {
      socket.close();
    }, 35000);
  });

  check(wsRes, {
    "WebSocket connected successfully": (r) => r && r.status === 101,
  });

  // SAFETY NET: Sleep for 1 second at the end of the loop to prevent infinite connection spam if WS fails
  sleep(1);
}
