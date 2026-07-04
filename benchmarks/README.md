# Benchmarks

k6 load-test scenarios for the deployed applications. **This directory is
deliberately outside every ApplicationSet glob** — ArgoCD never syncs it,
because a `TestRun` is an imperative act: applying one fires load at a
running service, and prune/self-heal must never re-fire it. Scenarios are
version-controlled here; running them is always an explicit command.

The pieces (deployed via `infrastructure-helm/`): the **k6-operator**
watches `TestRun` CRs and runs the scripts in short-lived runner pods;
results stream to **Prometheus** via remote write; the official **k6
dashboard** lives in Grafana's *Benchmarks* folder, filterable per run by
the `testid` tag each TestRun sets.

## Running a scenario

```bash
kubectl apply -k benchmarks/homepage-ramp/
# watch it
kubectl get testrun -n benchmarks
kubectl logs -n benchmarks -l runner=true -f
# grafana: Benchmarks folder -> k6 Prometheus -> testid=homepage-ramp
```

A TestRun is one-shot. To re-run, delete it first (the namespace and
script ConfigMap stay):

```bash
kubectl delete testrun -n benchmarks homepage-ramp
kubectl apply -k benchmarks/homepage-ramp/
```

Re-runs share the same `testid`, so on the dashboard they are separated
only by time range. For an A/B comparison, edit the `--tag testid=` in
`testrun.yaml` (e.g. `homepage-ramp-2replicas`) before the second run.

## Logging results

**Prometheus retention is 10 days** — dashboard data expires; git is the
durable record. After each run, append a record to
[`results.yaml`](./results.yaml) (schema documented in the file) and PR
it. Snapshot the target's image/replicas/limits *as they were during the
run* — those are the knobs future A/B runs compare against. Pull the
numbers from Prometheus before they age out:

```bash
kubectl port-forward -n monitoring svc/prometheus-prometheus 9099:9090 &
# totals, split into ok / failed:
curl -s http://localhost:9099/api/v1/query --data-urlencode \
  'query=sum by (expected_response) (max_over_time(k6_http_reqs_total{testid="<id>"}[3h]))'
```

(`timestamp(k6_vus{testid=...})` min/max gives the run window; exported
durations are in **seconds**.)

## Ground rules

- **Never target `*.simonjung.io` hostnames** — those are Cloudflare
  tunnels; hammering them load-tests Cloudflare's edge (against their
  ToS), not the cluster. Target Services directly
  (`http://<svc>.<ns>.svc:<port>`) or `*.cluster.simonjung.io` LAN
  ingresses to include the traefik path.
- **Read-only against production.** Write-path scenarios only against
  `-development` namespaces.
- Runners are pinned to the GPU node (`gpu: amd` selector) to keep load
  generation off the etcd servers. Watch for control-plane side effects
  during runs anyway (etcd fsync alerts, apiserver latency) — that's a
  finding, not noise.
- Keep `preAllocatedVUs`/`maxVUs` and the runner resource limits in step
  with the RPS ceiling: the arrival-rate executor keeps pushing the
  requested rate even when the target slows down, which is exactly what
  makes it a good benchmark and a bad neighbor.

## Adding a scenario

Copy `homepage-ramp/`, rename the TestRun + ConfigMap + `testid`, point
`script.js` at the new target, adjust the stages. Server-side context
(pod CPU/memory, restarts) is on the existing Grafana dashboards; the k6
dashboard shows the client side (RPS achieved, latency percentiles,
error rate).
