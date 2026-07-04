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

### Setting up a node

Identical on every node, only the timer weekday differs. New nodes get
this as the final provisioning step ([setup.md](./setup.md)) — pick the
next free weekday.

1. **Verify the timezone.** The 03:00 schedule and the one-node-per-night
   stagger assume local time is `America/New_York`; fresh installs often
   default to UTC.

   ```bash
   timedatectl
   sudo timedatectl set-timezone America/New_York   # if needed
   ```

2. **Install the plugin:**

   ```bash
   sudo dnf install dnf5-plugin-automatic
   ```

3. **Configure security-only updates with conditional reboot** — the
   package ships `/etc/dnf/automatic.conf` with a `[commands]` section;
   change these keys in place (don't append a duplicate section):

   ```ini
   # /etc/dnf/automatic.conf
   [commands]
   upgrade_type = security
   download_updates = true
   apply_updates = true
   reboot = when-needed
   ```

4. **Override the timer schedule** with a drop-in. The empty
   `OnCalendar=` line is intentional — it clears the package default
   before setting the node's slot:

   ```bash
   sudo mkdir -p /etc/systemd/system/dnf5-automatic.timer.d
   ```

   ```ini
   # /etc/systemd/system/dnf5-automatic.timer.d/override.conf
   [Timer]
   OnCalendar=
   OnCalendar=<Day> *-*-* 03:00
   RandomizedDelaySec=15m
   Persistent=true
   ```

5. **Enable:**

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now dnf5-automatic.timer
   ```

6. **Verify the drop-in applied** — `systemctl cat` must show
   override.conf appended after the stock unit, and `NEXT` must be the
   node's weekday at ~03:00 local (if it shows the package default
   instead, the drop-in didn't parse — re-check step 4 and
   `daemon-reload` again):

   ```bash
   systemctl cat dnf5-automatic.timer
   systemctl list-timers dnf5-automatic.timer
   ```

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
the target Fedora release ([setup.md](./setup.md)). With the HA control
plane (three servers on embedded etcd) no k3s state needs preserving:
drain and `kubectl delete node` first, wipe, then rejoin as a server per
setup.md and etcd re-replicates (done for `amley00` 2026-07-04).
