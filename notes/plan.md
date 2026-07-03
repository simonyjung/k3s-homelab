# Cluster & Repo Improvement Plan

Active items only — completed work is archived in `history/` (one file per quarter).
Status: `todo` | `in-progress` | `done` | `skipped`

## Open items

| # | Status | Item |
|---|--------|------|
| 6.4 | `in-progress` | **Node OS hygiene** — agents DONE (2026-07-03): amley01/02/amleyg00 upgraded F43→F44 stable (7.0.14-201.fc44) one-at-a-time; dnf5-automatic enabled (security-only, reboot=when-needed, staggered Tue/Wed/Thu 03:00 America/New_York); docs/node-updates.md (PR #84). **Remaining: amley00 is a Rawhide tracker** (only `rawhide` repo enabled, fedora-repos-45, F45-prerelease userspace + 7.2rc1 kernel after distro-sync) — downgrade unsupported; decided: clean F44 reinstall preserving `/etc/rancher/k3s` + `/var/lib/rancher/k3s` (needs physical access; Mon 03:00 reboot slot reserved for its dnf5-automatic timer afterward). Node **frozen** (no updates, no dnf5-automatic) until then. Incident logged in history 6.3/6.4: single-replica traefik stranding → PR #85 (replicas=2, merged). |
| 6.10 | `in-progress` | **HA control plane conversion (2026-07-03)** — DONE: SQLite backed up off-node (integrity-checked); amley00 migrated to embedded etcd (`cluster-init: true`); amley01+02 drained, rejoined as servers (`disable: [servicelb, traefik]`), Longhorn rebuilt between nodes; docs PR #88 open. Docs PR #88 merged + synced. End-to-end verified: 3 etcd members healthy, API answers on all three server IPs, Longhorn 7/7 healthy, apps 16/16 Synced/Healthy, memory 10–24% on servers. First scheduled etcd snapshot VERIFIED (12:00 2026-07-03, one per server, ~24MB, `kubectl get etcdsnapshotfiles`). kube-vip API VIP `10.0.10.250` live (PR #89), kubeconfig switched. Remaining: watch etcd stability for a few days (fsync latency vs Longhorn IO — apiserver restarts / leader elections in `journalctl -u k3s`), then archive to history. Follow-ups deferred below (offsite snapshot copy, stable API endpoint). |
| 6.9 | `in-progress` | Longhorn backups — **first scheduled nightly VERIFIED 2026-07-03**: all 7 volumes backed up at 02:00 America/New_York, all Completed. Remaining: delete the `preupgrade-*` manual backups once nightlies have a few days of history (manual backups are never auto-pruned; check ~2026-07-07), and schedule an annual restore drill. |

## Follow-ups / deferred

- **amley00 F44 reinstall** (see 6.4) — **greatly simplified by the HA conversion (6.10)**: no k3s state preservation needed. Wipe, provision per docs/setup.md, then rejoin as a *server* (config.yaml: `server: https://10.0.10.21:6443` — point at a *surviving* server — plus token and `disable: [servicelb, traefik]`; no `cluster-init`); delete the old node object first; etcd re-replicates. Re-apply the dnf5-automatic Monday timer.
- **etcd snapshot offsite copy** (from 6.10) — snapshots land on each server's local disk (00:00/12:00, retention 5); K3s only ships to S3 natively and the NAS is NFS. Options: systemd timer rsyncing `/var/lib/rancher/k3s/server/db/snapshots` to the NAS, or Synology S3-compatible endpoint. Low urgency: cluster state is rebuildable from git.
- ~~Stable API endpoint~~ **DONE 2026-07-03** (PR #89): kube-vip ARP VIP `10.0.10.250:6443` (`infrastructure/kube-vip/`), `tls-san` applied on all three servers, kubeconfig switched to the VIP (backup: `~/.kube/config.bak-pre-vip`). Server *join* configs still name a node IP — fine (only used at join; joined nodes learn all servers).
- **Plex hardware transcode — BLOCKED UPSTREAM on Plex** (diagnosed exhaustively 2026-07-03): Plex's bundled radeonsi driver supports only up to gfx1103 (~2023); Strix Halo is gfx1151. Their transcoder is **musl-linked**, so it cannot load the distro's glibc mesa (verified: system stack encodes h264_vaapi at 10.9× realtime on this node; Plex's own driver fails VAAPI init err 2). Kernel/VCN/permissions/settings/Plex Pass all verified good. Fix must come from Plex shipping a newer driver bundle — watch PMS releases (on 1.43.2, latest stable) and re-test after upgrades (`kubectl exec` grep `gfx[0-9]{3,4}` in the rsv driver; hw works when gfx1151 appears). PRs #90/#91 added mesa/libva to the container — useless across the musl wall; reverted in PR #93 (2026-07-03). Report filed with Plex (draft provided 2026-07-03).

## Healthy (no action)

- All 16 ArgoCD apps Synced/Healthy; fleet on k3s v1.36.2; agents on Fedora 44 stable.
- LAN ingress via MetalLB L2 VIP `10.0.10.200` (traefik ×2 replicas); public via Cloudflare Tunnels.
- Longhorn backup target `nfs://192.168.40.118:/volume1/longhorn` available; nightly incrementals scheduled.
- Alerting: Pushover (allowlist routing), cert-expiry rules, k3s false positives silenced.
