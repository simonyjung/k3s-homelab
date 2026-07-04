import http from 'k6/http';
import { check } from 'k6';

// Knee-finder for linkding (django + sqlite, 1 replica, 250m cpu limit).
// Targets the DEVELOPMENT namespace: identical image and resource limits
// to production (dev only patches PVC/Service), so the knee transfers -
// and saturating prod would take the real bookmarks down mid-test.
// Anonymous / just 302s; /login is a full Django template render (~3.3KB)
// and needs no Host header (linkding defaults ALLOWED_HOSTS=*; verified
// 200 in-cluster). No thresholds: failures at the top are the data.
export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 150,
      maxVUs: 300,
      stages: [
        { duration: '1m', target: 25 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};

export default function () {
  const res = http.get('http://linkding.linkding-development.svc:3000/login');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
