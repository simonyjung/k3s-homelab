import http from 'k6/http';
import { check } from 'k6';

// Baseline for django-starter (development): same 5->100 rps profile as
// the homepage runs so records compare across apps. Service-direct with
// an explicit Host header - Django's ALLOWED_HOSTS 400s without it
// (verified: plain GET = 400, with header = 200).
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
};

const params = {
  headers: { Host: 'django-starter-dev.cluster.simonjung.io' },
};

export default function () {
  const res = http.get('http://django-starter.django-starter-development.svc:8000/', params);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
