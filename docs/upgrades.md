# Kubernetes (K3s) Upgrades

K3s upgrades are GitOps-managed by the
[system-upgrade-controller](https://github.com/rancher/system-upgrade-controller)
(SUC), deployed from `infrastructure/system-upgrade/`. Upgrading the cluster
is a one-line change to `infrastructure/system-upgrade/plans.yaml`, merged to
`main` like any other change. There is nothing to SSH into.

The cluster was last upgraded 1.33 → 1.36 this way on 2026-07-02.

## How it works

`infrastructure/system-upgrade/` contains:

- `crd.yaml`, `system-upgrade-controller.yaml` — the SUC manifests, vendored
  verbatim from the upstream release (v0.19.2). They are exempted from
  yamllint in `.yamllint`.
- `plans.yaml` — two `Plan` CRs pinned to an explicit k3s version:
  - `k3s-server` upgrades the control-plane node (`amley00`) first.
  - `k3s-agent` upgrades the agent nodes one at a time (`concurrency: 1`),
    and its `prepare` step blocks until the server plan finishes.

Plans **cordon but do not drain**: running containers survive the k3s
restart untouched, and Longhorn replicas stay where they are. Nodes are
uncordoned automatically when their upgrade job succeeds.

## Upgrade procedure

1. **Check what's available:**

   ```bash
   curl -s https://update.k3s.io/v1-release/channels | \
     python3 -c "import json,sys; [print(c['id'],c['latest']) for c in json.load(sys.stdin)['data'] if c['id'] in ('stable','v1.36','v1.37')]"
   ```

2. **Pre-flight checks:**
   - **One minor version per hop.** Kubernetes control planes cannot skip
     minors: going 1.36 → 1.38 means two separate commits, 1.37.x first,
     verifying cluster health in between.
   - **Longhorn compatibility.** Check the target Kubernetes version is
     listed in the Longhorn best-practices support matrix
     (`https://longhorn.io/docs/<longhorn version>/best-practices/`)
     for the Longhorn version pinned in
     `infrastructure-helm/longhorn-system/Chart.yaml`. Upgrade Longhorn
     first if not.
   - Longhorn backup target is reachable:
     `kubectl get backuptarget -n longhorn-system` shows `AVAIL: true`.

3. **Bump the version** (both plans) in
   `infrastructure/system-upgrade/plans.yaml`:

   ```yaml
   version: v1.37.1+k3s1   # in BOTH k3s-server and k3s-agent
   ```

4. **Commit and merge to `main`.** ArgoCD syncs the plans; SUC upgrades the
   server node, then each agent. Expect a brief API outage while `amley00`'s
   k3s restarts. A full pass over 4 nodes takes roughly 10–15 minutes.

5. **Verify:**

   ```bash
   kubectl get nodes                      # all on the new version, Ready, no SchedulingDisabled
   kubectl get applications -n argocd     # everything Synced/Healthy
   kubectl get pods -A | grep -vE 'Running|Completed'
   ```

6. **Repeat** from step 3 for the next minor, if hopping multiple versions.

## Known quirks

- **Upgrade job pods stuck in `Unknown`** in the `system-upgrade` namespace
  are normal: the pod that upgrades a node gets interrupted when that node's
  kubelet restarts underneath it. SUC re-runs the job to completion and the
  orphans are garbage-collected eventually. A `Completed` sibling pod is the
  one that counts.
- **New API-server-defaulted fields can confuse ArgoCD's diff.** After the
  1.34 hop, Kubernetes started defaulting
  `spec.persistentVolumeClaimRetentionPolicy` on StatefulSets and grafana
  showed permanently OutOfSync even though `kubectl diff` was clean. Fix was
  `argocd.argoproj.io/compare-options: ServerSideDiff=true` in the
  infrastructure-helm ApplicationSet (required pairing with
  `ServerSideApply=true`). If an app is stuck OutOfSync right after an
  upgrade with no real drift, suspect this class of problem.
- **Node unreachable during an upgrade:** its plan job simply waits; the
  node upgrades when it next comes back. The other nodes are not blocked
  (server plan runs first regardless; agent plan processes nodes it can
  reach).

## Upgrading the controller itself

Renovate watches the vendored manifest's image tags and raises a PR when a
new SUC release (or a newer `rancher/kubectl` job image) is available. For
the kubectl image the tag bump is the whole change — merge it. For the
**controller** a tag bump alone is not enough: the vendored RBAC/CRD
manifests may have changed between releases, so treat the PR as a
notification and re-vendor from the upstream release instead:

```bash
cd infrastructure/system-upgrade
curl -sLO https://github.com/rancher/system-upgrade-controller/releases/download/<tag>/crd.yaml
curl -sLO https://github.com/rancher/system-upgrade-controller/releases/download/<tag>/system-upgrade-controller.yaml
# update the version comment in kustomization.yaml, then commit
```
