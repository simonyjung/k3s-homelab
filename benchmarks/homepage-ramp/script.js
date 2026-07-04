import http from 'k6/http';
import { check } from 'k6';

// Reference ramp: 5 -> 100 requests/second against homepage, ~8 minutes.
// The open (arrival-rate) model holds the requested RPS regardless of
// response times, so a slowdown shows up as latency, not reduced load.
export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  // Service-direct: benchmarks the app itself (homepage has no LAN
  // ingress; its public route is a Cloudflare tunnel we must not load)
  const res = http.get('http://homepage.homepage-production.svc:3000/');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
