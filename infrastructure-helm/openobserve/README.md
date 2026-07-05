# openobserve

Log storage and search for the cluster: an umbrella chart bundling

- **openobserve-standalone** — single-node [OpenObserve](https://openobserve.ai/) server.
  Parquet on a 20Gi `longhorn-1replica` PVC (logs are disposable — no 3x replication,
  node loss loses history), 15-day retention, prefers `amleyg00` to keep IO off the
  etcd servers. UI at <https://logs.cluster.simonjung.io> (LAN-only, own login).
- **fluent-bit** — DaemonSet on every node shipping two streams to the `default` org:
  `containers` (all pod logs, tailed from `/var/log/containers`, enriched with k8s
  metadata) and `k3s` (the `k3s.service`/`k3s-agent.service` journal, incl. embedded etcd).

Root credentials come from the 1Password login item `openobserve-root-credentials`
(username **must be an email** — it doubles as the root login). Fluent Bit
authenticates with the same secret; if that ever bothers, create a dedicated
ingestion user in the UI and point the fluent-bit `env` at a second item.

Post-deploy notes:

- The log PVC joins Longhorn's `default` recurring-job group like every volume,
  so it gets nightly backups it doesn't need — see the plan item for excluding it.
- First deploy: fluent-bit pods sit in CreateContainerConfigError until the
  1Password operator materialises the secret; they recover on their own.
