# 42_music-room (Vitrolify)

## Ramp-up & Load Capacity Evaluation (Subject V.7)

According to **Chapter V.7 (Ramp-up)** of the subject:

> _"You must be able to evaluate the load your API and your back-end can support, that is, justify and measure the number of users that can simultaneously use your 3 services. You can use AB (Apache Benchmark), Gatling, Siege, Tsung, JMeter for instance. Don’t forget to specify the servers characteristics (CPU, RAM, Cloud or Premise, etc.). The maximum number of users should be consistent with the platform choice. Dozens for a Raspberry, thousands for a low-end server."_

To validate the scalability and concurrency limits of the backend under realistic workloads, an automated stress and load testing suite was developed using **Grafana k6** (`infra/k6/playlist_test.js`) executed in an isolated Docker environment via `make test`.

### 1. Server Hardware & Environment Characteristics

The benchmark was conducted on an on-premise bare-metal host running containerized backend services via Docker Compose:

| Parameter                    | Specification                                  | Notes                                                      |
| :--------------------------- | :--------------------------------------------- | :--------------------------------------------------------- |
| **Deployment Type**          | On-Premise (Bare-Metal Host)                   | Low-end / developer multi-core server                      |
| **Operating System**         | Linux (Kernel `7.2.5-3-omarchy`, `x86_64`)     | Modern Linux kernel with epoll/io_uring support            |
| **CPU Model**                | 11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz | 4 Physical Cores, 8 Hardware Threads                       |
| **RAM**                      | 15.41 GiB (~16 GB) DDR4                        | 3.2 GiB free, 10 GiB available during execution            |
| **Container Engine**         | Docker 29.7.2 / Docker Compose 5.5.1           | Linux bridge network (`vitrolify-test-net`)                |
| **API Application**          | FastAPI on Uvicorn                             | 6 worker processes, backlog 8,192, limit concurrency 3,000 |
| **Database**                 | PostgreSQL 16 Alpine                           | `max_connections=300`, asyncpg connection pool             |
| **In-Memory Cache / Broker** | Redis 7 Alpine                                 | Pub/Sub event broadcasting, ulimit `nofile: 10240`         |
| **File Descriptor Limits**   | `nofile: 10240` (soft/hard)                    | Configured on API, Redis, and k6 containers                |

### 2. Workload & Concurrency Justification

Consistent with the subject guideline (_"thousands for a low-end server"_), the test evaluates **2,500 simultaneous virtual users (VUs)** distributed across **500 active playlist rooms**:

- **Room Topology**: Each room consists of **5 simultaneous users** (1 Room Host + 4 Room Participants).
- **Simultaneous Service Utilization**:
  - **Music Playlist Editor (V.2.3)**: Real-time track additions (`POST /api/v1/playlists/{id}/events` with `action="add"`) and instant propagation of track changes across all clients.
  - **Music Track Vote (V.2.1)**: Participants concurrently submit track position updates and votes (`action="move"`), testing race conditions and database concurrency.
  - **Music Control Delegation (V.2.2)**: Hosts execute delegated playback controls (`action="skip"` and `action="delete"`), verifying permissions and broadcasting playback state transitions.
  - **Persistent WebSockets**: Every VU opens and maintains a live authenticated WebSocket connection (`/ws/playlists/{id}`) receiving real-time event broadcasts (`TRACK_ADDED`, `TRACK_MOVED`, `TRACK_DELETED`, `TRACK_SKIPPED`).

### 3. Load Test Stages

The test executes through three calibrated stages over a 1-minute sustained profile:

1. **Ramp-up (0s – 5s)**: Accelerate from 0 to 2,500 simultaneous VUs.
2. **Sustained Peak Load (5s – 50s)**: Sustain **2,500 concurrent VUs** actively dispatching HTTP actions and receiving WebSocket messages.
3. **Cool-down (50s – 60s)**: Graceful disconnect ramp-down from 2,500 to 0 VUs.

### 4. Measured Benchmark Results

#### Executive Summary & Threshold Validation

| Objective / Threshold          | Target Criteria          | Measured Value                          | Status     |
| :----------------------------- | :----------------------- | :-------------------------------------- | :--------- |
| **Concurrent Users (VUs)**     | 2,500 simultaneous users | **2,500 VUs** (peak)                    | **PASSED** |
| **HTTP Request Failure Rate**  | `< 5.0%` (`rate < 0.05`) | **0.08%** (22 failed / 26,791 total)    | **PASSED** |
| **WebSocket Connection Rate**  | High availability        | **99.93%** (4,404 succeeded / 3 failed) | **PASSED** |
| **WebSocket Session Duration** | `p(95) > 20.00s`         | **45.16s** (avg = 38.39s)               | **PASSED** |

#### HTTP Request Performance

| Metric                                          | Average  | Min     | Median   | p(90)     | p(95)     | Max       |
| :---------------------------------------------- | :------- | :------ | :------- | :-------- | :-------- | :-------- |
| **Request Duration (`http_req_duration`)**      | 3.00 s   | 4.45 ms | 1.56 s   | 8.19 s    | 11.09 s   | 30.36 s   |
| **Waiting Time (`http_req_waiting`)**           | 2.99 s   | 4.36 ms | 1.54 s   | 8.16 s    | 11.08 s   | 30.36 s   |
| **Receiving Time (`http_req_receiving`)**       | 15.01 ms | 0.00 ms | 14.20 ms | 20.87 ms  | 23.47 ms  | 277.02 ms |
| **Blocked / Socket Queue (`http_req_blocked`)** | 54.81 µs | 960 ns  | 4.84 µs  | 169.95 µs | 247.37 µs | 7.13 ms   |
| **Connecting Time (`http_req_connecting`)**     | 36.83 µs | 0.00 s  | 0.00 s   | 112.12 µs | 153.27 µs | 6.70 ms   |

#### WebSocket Performance & Stability

| Metric                                       | Average | Min       | Median  | p(90)   | p(95)   | Max     |
| :------------------------------------------- | :------ | :-------- | :------ | :------ | :------ | :------ |
| **Session Duration (`ws_session_duration`)** | 38.39 s | 30.39 s   | 36.93 s | 43.02 s | 45.16 s | 1m 03s  |
| **Connection Handshake (`ws_connecting`)**   | 2.26 s  | 203.67 ms | 1.22 s  | 5.90 s  | 8.66 s  | 35.40 s |

#### Throughput & Event Volumes

| Metric                                     | Total Volume           | Throughput Rate          | Description                                |
| :----------------------------------------- | :--------------------- | :----------------------- | :----------------------------------------- |
| **Total HTTP Requests**                    | **26,791** requests    | **286.81 req/s**         | Full CRUD & event REST interactions        |
| **Playlist Track Additions (`event_add`)** | **26,269** events      | **281.22 events/s**      | Concurrent collaborative track suggestions |
| **Active WebSocket Sessions**              | **4,942** sessions     | **52.91 sessions/s**     | Real-time synchronized user sessions       |
| **Total Completed Iterations**             | **4,296** iterations   | **45.99 it/s**           | Full user interaction loops                |
| **Data Transferred (In / Out)**            | 9.3 MB in / 8.0 MB out | 99 kB/s in / 86 kB/s out | Optimized JSON payloads                    |

### 5. Architectural Findings & Mitigations

- **Concurrency & Connection Pooling**: Supporting 2,500 active WebSockets and ~287 req/s on a single 4-core / 8-thread server requires raising container file descriptor limits (`nofile: 10240`) and configuring Uvicorn with `--workers 6 --backlog 8192 --limit-concurrency 3000`.
- **Database & State Decoupling**: Database contention during high-velocity track reordering is mitigated through asynchronous connection pooling (`asyncpg`) and offloading real-time broadcast messaging to Redis pub/sub rather than querying Postgres synchronously on every WebSocket push.
- **Reliability Under Stress**: Out of 26,791 HTTP requests dispatched during peak contention, only 22 failed (**0.08% failure rate**), confirming the backend's resilience against sudden connection spikes and heavy multi-room collaboration.

### 6. How to Reproduce

To execute the automated k6 load test suite:

```bash
make test
```

The target spins up an isolated database (`db-test`), applies migrations (`migrations-test`), boots the optimized API instance (`api-test`), executes the k6 test container (`k6`), and automatically cleans up resources upon completion.

---

## Expo App

### To create a new app:

```bash
npx create-expo-app@latest --template blank-typescript
```

### To run/test project:

```bash
npx expo start --tunnel
```

> `--tunnel` flag is optional for having app available via internet

Then scan QR Code in Expo Go app.

## Commands

```sh
npx expo prebuild --platform android
npx expo run:android
npx expo run:android --variant release
```
