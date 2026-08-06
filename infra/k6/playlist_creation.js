import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 2,
  duration: "5s",

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
  },
};

export default function () {
  const BASE_URL = __ENV.K6_API_BASE_URL || "http://localhost:8000";
  const token = `test-user-${__VU}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // ------------------------------------------------------------------
  // Generate a truly unique name to prevent DB constraint errors
  // ------------------------------------------------------------------
  const uniqueName = `Test Playlist - User ${__VU} - Iter ${__ITER} - ${Date.now()}`;

  const createPayload = JSON.stringify({
    name: uniqueName,
    public: true,
    invited_only_edit: false,
  });

  const createRes = http.post(`${BASE_URL}/api/v1/playlists`, createPayload, {
    headers,
  });

  const createSuccess = check(createRes, {
    "POST /playlists status is 201": (r) => r.status === 201,
    "POST /playlists returned valid JSON ID": (r) => {
      try {
        return JSON.parse(r.body).id !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (createSuccess) {
    const playlistId = JSON.parse(createRes.body).id;
    const getRes = http.get(`${BASE_URL}/api/v1/playlists/${playlistId}`, {
      headers,
    });

    check(getRes, {
      "GET /playlists/{id} status is 200": (r) => r.status === 200,
      "GET /playlists/{id} matches created name": (r) => {
        try {
          return JSON.parse(r.body).name === uniqueName;
        } catch (e) {
          return false;
        }
      },
    });
  }

  sleep(3);
}
