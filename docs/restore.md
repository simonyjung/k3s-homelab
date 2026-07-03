# Backup & Restore

Longhorn backs up every volume to the Synology NAS
(`nfs://192.168.40.118:/volume1/longhorn`) on a schedule defined in
`infrastructure-helm/longhorn-system/values.yaml` (`recurringJobs`):

| Job | Schedule | Retention |
|---|---|---|
| `backup-daily` | 02:00 daily | newest 7 per volume |
| `backup-weekly` | 03:00 Sunday | newest 4 per volume |
| `snapshot-cleanup` | 04:00 daily | purges system/error snapshots (on-node) |
| `filesystem-trim` | 00:00 daily | reclaims deleted blocks |

Backups are block-incremental; each job auto-prunes its own backups beyond
the retention count. **Manual backups are never auto-pruned** — delete them
yourself when done with them.

What is and isn't covered:

- **Covered:** all Longhorn PVCs — linkding data, plex config/metadata,
  transmission config, grafana, prometheus, alertmanager.
- **Not covered, by design:** media on the NAS NFS shares (protect on the
  Synology itself), Kubernetes state (reconstructed from this repo),
  secrets (live in 1Password; only the Connect credentials in the
  `1password` namespace are cluster-local — keep a copy of
  `1password-credentials.json` and the operator token in 1Password itself).

## Restoring a single volume (data loss / corruption in one app)

ArgoCD works against a restore: `selfHeal` will scale the app back up and
the ApplicationSet controller reverts spec edits within ~3 minutes. Pause
both first.

1. **Pause reconciliation** (example: linkding in production):

   ```bash
   # Stop the appset from reverting Application spec changes
   kubectl annotate applicationset production-applicationset -n argocd \
     argocd.argoproj.io/applications-sync=create-only
   # Turn off this app's automated sync + self-heal
   kubectl patch application linkding-production -n argocd --type merge \
     -p '{"spec":{"syncPolicy":{"automated":null}}}'
   ```

2. **Stop the workload** so the volume detaches:

   ```bash
   kubectl scale deploy/linkding -n linkding-production --replicas=0
   ```

3. **Restore in the Longhorn UI** (<https://longhorn.cluster.simonjung.io>):
   *Backup* page → pick the volume (name matches the PVC's `volumeName`,
   see `kubectl get pvc -n <ns>`) → choose a backup → **Restore**. Give the
   restored volume a recognizable name.

4. **Swap the PVC to the restored volume.** Delete the old PVC (the PV
   goes with it — this is the destructive step; the old data is what you
   are replacing), then in Longhorn UI select the restored volume →
   **Create PV/PVC**. Longhorn recreates the PVC with the original
   name/namespace recorded in the backup, which the deployment mounts by
   name.

5. **Resume:** scale the deployment back to 1, verify the app's data, then
   undo step 1:

   ```bash
   kubectl annotate applicationset production-applicationset -n argocd \
     argocd.argoproj.io/applications-sync-
   kubectl annotate application linkding-production -n argocd \
     argocd.argoproj.io/refresh=normal --overwrite
   ```

   The appset restores the automated sync policy from its template within
   a few minutes; confirm the app returns to `Synced/Healthy`.

## Control-plane (etcd) snapshots

The control plane is three servers (`amley00/01/02`) on **embedded
etcd**, which snapshots itself on a schedule: 00:00 and 12:00 host time,
retention 5, written to `/var/lib/rancher/k3s/server/db/snapshots` on
each server. Check them with `ssh <server> sudo k3s etcd-snapshot ls`.

- **One server lost** (disk death, OS reinstall): no etcd restore
  needed. Delete the old node object and rejoin the machine as a server
  per [setup.md](./setup.md) — etcd re-replicates to it.
- **Quorum lost (2+ servers dead):** on the best surviving server, stop
  k3s and reset the cluster from a snapshot, then rejoin the others:

  ```bash
  sudo k3s server --cluster-reset \
    --cluster-reset-restore-path=<snapshot file>
  ```

  See the [K3s backup/restore docs](https://docs.k3s.io/datastore/backup-restore)
  for details.
- Snapshots live on the servers' own disks; losing all three machines
  loses them too. Cluster *state* is mostly rebuildable from git (below),
  so this is acceptable — app data is what the Longhorn NFS backups are for.

## Full disaster recovery (rebuild the cluster)

Order matters: ArgoCD and the 1Password secrets are the only two things
git cannot bootstrap by itself.

1. **Rebuild nodes / K3s** per [setup.md](./setup.md).
2. **Install ArgoCD** from this repo (it later adopts itself via the
   `argocd` app):

   ```bash
   helm dependency build infrastructure-helm/argocd
   helm install argocd infrastructure-helm/argocd -n argocd \
     --create-namespace -f infrastructure-helm/argocd/values.yaml
   ```

3. **Seed the 1Password credentials** (from the copies stored in the
   1Password vault — raw JSON, see the gotcha in `plan.md` item 2.1):

   ```bash
   kubectl create ns 1password
   kubectl create secret generic op-credentials -n 1password \
     --from-file=1password-credentials.json=<raw json file>
   kubectl create secret generic onepassword-token -n 1password \
     --from-literal=token=<operator token>
   ```

4. **Bootstrap everything:** `kubectl apply -f root-argocd-app.yaml` and
   add the repo deploy key if the git SSH secret is not yet in place.
   ArgoCD recreates every app; namespaces, certs, and secrets reconcile
   on their own.
5. **Reconnect backups:** Longhorn (deployed by the appset) already points
   at the NFS backup target through its values, so the *Backup* page
   lists every previous volume. Restore volumes as in the single-volume
   procedure above — restore + Create PV/PVC **before** scaling up each
   data-bearing app (or scale to 0, swap, scale up).
6. Verify: nodes Ready, `kubectl get applications -n argocd` all
   Synced/Healthy, spot-check app data, and confirm the plex router port
   forward + Cloudflare tunnels reconnect.

## Verifying backups exist

```bash
kubectl get backupvolumes -n longhorn-system          # one per volume
kubectl get backups -n longhorn-system | tail -5      # recent backups
kubectl get backuptarget -n longhorn-system           # AVAIL should be true
```

A restore drill (single-volume procedure against a scratch PVC) is worth
doing once a year — backups only count if they restore.
