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
- **Migrations:** the chart's migrate Job runs as a helm
  post-install/pre-upgrade hook, which ArgoCD executes as sync hooks and
  recreates each time (`before-hook-creation`).

First deploy: register the first account promptly — the first signup is
open, then registration is closed by default. Email is the console
backend (invites/alert emails go to the web pod log); use in-app webhook
alert rules instead.
