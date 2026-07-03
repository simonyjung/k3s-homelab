# Node OS Updates

How the Fedora nodes stay patched: automatic security updates weekly per
node with conditional reboots, and a manual runbook for major version
upgrades. Kubernetes-level upgrades (k3s itself) are separate — see
[upgrades.md](./upgrades.md).

## Automatic security updates (dnf5-automatic)

Each node runs `dnf5-automatic` (package `dnf5-plugin-automatic`) with
security-only updates and `reboot = when-needed`, on a **per-node weekday**
so at most one node can ever reboot per night:

| Node     | Timer night (03:00 local + ≤15 min jitter) |
| -------- | ------------------------------------------ |
| amley00  | Monday                                      |
| amley01  | Tuesday                                     |
| amley02  | Wednesday                                   |
| amleyg00 | Thursday                                    |

Key properties:

- **Never crosses a major version.** `$releasever` is pinned to the
  installed release; dnf5-automatic only applies updates within it. Major
  hops are always the explicit runbook below.
- **Reboots only when required** (kernel/systemd/glibc-class updates), at
  most weekly, one node per night. The cluster absorbs a single-node
  reboot by design: MetalLB moves the ingress VIP (~10 s, see
  [load-balancing.md](./load-balancing.md)), Longhorn tolerates a replica
  going away briefly, and workloads reschedule.
- Max security lag is ~1 week per node. Anything urgent can be applied by
  hand ahead of the timer.

Config (identical on every node, only the timer weekday differs):

```ini
# /etc/dnf/automatic.conf
[commands]
upgrade_type = security
download_updates = true
apply_updates = true
reboot = when-needed
```

```ini
# /etc/systemd/system/dnf5-automatic.timer.d/override.conf
[Timer]
OnCalendar=
OnCalendar=<Day> *-*-* 03:00
RandomizedDelaySec=15m
Persistent=true
```

Enable with `sudo systemctl daemon-reload && sudo systemctl enable --now
dnf5-automatic.timer`. New nodes get this as part of provisioning
([setup.md](./setup.md)) — pick the next free weekday.

### Checking on it

```bash
systemctl list-timers dnf5-automatic.timer   # next/last run
journalctl -u dnf5-automatic -n 50           # what it did
dnf needs-restarting -r                      # is a reboot pending?
```

## Major version upgrades (e.g. Fedora 43 → 44)

One node at a time, control plane first, **cordon before, verify after**.
The offline-upgrade reboot takes 15–30 min per node.

1. Cordon: `kubectl cordon <node>` (from a workstation).
2. On the node:

   ```bash
   sudo dnf update -y                                  # current within old release
   sudo dnf system-upgrade download --releasever=<N> -y
   sudo dnf system-upgrade reboot                      # offline upgrade + reboot
   ```

   `system-upgrade` is built into dnf5 on Fedora 43+ — no plugin package
   to install.
3. After it returns: confirm the version
   (`kubectl get node <node> -o jsonpath='{.status.nodeInfo.osImage}'`),
   uncordon, and **wait until Longhorn volumes are all healthy and Argo CD
   apps are all green before starting the next node**.

Gotchas seen in practice:

- **Stale packages block the depsolve** (e.g. a library not rebuilt for
  the new release: `...does not belong to a distupgrade repository`).
  Remove the offender (`sudo dnf remove <pkg>`) and retry, or run the
  download with `--allowerasing` (without `-y`) and review the removal
  list before confirming.
- **Do not overlap nodes.** A node rebooting while the previous one is
  still settling can leave a single-replica workload (e.g. an ingress
  controller) with nowhere to run — this caused a brief full-ingress
  outage once. Cordon, upgrade, verify, then move on.
- Fedora release upgrades are supported one or two releases forward but
  **downgrades are not supported at all** — double-check `--releasever`
  before hitting enter, and never point a node at rawhide.

## Fixing a node that tracks Rawhide

Symptom: `osImage` reports "Prerelease", `dnf repolist --enabled` shows a
`rawhide` repo, RC kernels appear. A rawhide box cannot be downgrade-synced
to a stable release reliably; the supported fix is a clean reinstall of
the target Fedora release ([setup.md](./setup.md)), preserving
`/etc/rancher/k3s` and `/var/lib/rancher/k3s` if it is the k3s server so
the cluster state (sqlite datastore, certs, tokens) survives the rebuild.
