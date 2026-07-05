# GlitchTip

Sentry-SDK-compatible error tracking for the in-cluster Django apps
(plan item 11.2). Apps report with the stock `sentry-sdk` package
pointed at a DSN from this instance; migrating to sentry.io later is a
DSN swap.

- **UI:** https://glitchtip.cluster.simonjung.io (LAN-only Traefik
  ingress; no Cloudflare tunnel — nothing off-LAN reports errors)
- **Chart:** umbrella over [glitchtip](https://gitlab.com/glitchtip/glitchtip-helm-chart);
  web ×2 with the worker embedded, bundled valkey as a transient cache
- **Database:** own CNPG cluster `glitchtip-db` (2 instances,
  `longhorn-1replica`), same shape as linkding-db. The chart's
  `postgresql.enabled` is deliberately off — it renders a bare Cluster
  without resources or a PodMonitor. `DATABASE_URL` comes from the
  operator-generated `glitchtip-db-app` secret (`uri` key).
- **Secrets:** Django `SECRET_KEY` from 1Password item
  `glitchtip-secret-key` (field labeled `SECRET_KEY`).
- **Migrations:** the chart's own migrate Job is disabled — as a helm
  pre-upgrade hook ArgoCD runs it as PreSync, which deadlocks on a first
  install (it waits on secrets the Sync phase hasn't applied yet).
  `templates/migrate-job.yaml` replaces it as a Sync-phase hook. Bump
  the pinned `glitchtip.image.tag` together with chart dependency bumps.

First deploy: register the first account promptly — the first signup is
open, then registration is closed by default. Email is the console
backend (invites/alert emails go to the web pod log); use in-app webhook
alert rules instead.
