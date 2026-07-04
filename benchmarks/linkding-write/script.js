import http from 'k6/http';
import { check } from 'k6';

// WRITE-path knee for linkding (development ONLY - ground rules). Each
// iteration POSTs a unique bookmark via the REST API; title+description
// are supplied inline so linkding never scrapes the URL synchronously -
// this measures token-auth + ORM insert, i.e. the database write path.
// Auth token comes from the linkding-api-token secret in the benchmarks
// namespace (created out-of-git; see results.yaml record 8).
export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 300,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 60 },
        { duration: '2m', target: 120 },
        { duration: '1m', target: 120 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};

const params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Token ${__ENV.LINKDING_TOKEN}`,
  },
};

export default function () {
  const payload = JSON.stringify({
    url: `https://bench.invalid/${__VU}/${__ITER}`,
    title: `bench ${__VU}-${__ITER}`,
    description: 'k6 write benchmark row',
  });
  const res = http.post(
    'http://linkding.linkding-development.svc:3000/api/bookmarks/',
    payload,
    params,
  );
  check(res, { 'status is 201': (r) => r.status === 201 });
}
