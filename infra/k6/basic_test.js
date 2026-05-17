import http from "k6/http";
import { sleep } from "k6";

export const options = {
  vus: 50, // Number of virtual users to simulate
  duration: "60s",
};

// 3. Test Logic
export default function () {
  const baseUrl = __ENV.K6_API_BASE_URL;
  http.get(baseUrl);
  sleep(1);
}
