import http from 'k6/http';
import { check } from 'k6';

// Knee-finder: run 2026-07-04-homepage-ramp-2replicas-1 sailed through
// 100 rps (p95 22.6ms, 14 VUs) - push to 300 rps to find where 2x500m
// actually bends. No thresholds: failures at the top are the data.
export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 600,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 600 },
        { duration: '1m', target: 600 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};

export default function () {
  const res = http.get('http://homepage.homepage-production.svc:3000/');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
