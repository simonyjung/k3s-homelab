# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A declarative GitOps repository for a K3s homelab. There is **no build or run step**: the cluster is the runtime. ArgoCD watches this repo and continuously reconciles the cluster to match `main`. "Deploying" means merging to `main`; ArgoCD (with `prune: true` and `selfHeal: true` on every app) does the rest. The git remote ArgoCD reads is `git@github.com:simonyjung/k3s-homelab.git`.

The cluster has 4 nodes: `amley00` (`10.0.10.20`), `amley01`, and `amley02` (MiniPCs) are an HA control plane — three K3s servers on embedded etcd — and `amleyg00` (a Framework Desktop with AMD GPU, node-label `gpu=amd`) is an agent. `docs/setup.md` covers provisioning new nodes (agents and servers).

## Cluster access

If a kubeconfig is available (context `amley`), you can inspect live state directly. ArgoCD `Application`/`ApplicationSet` resources live in the `argocd` namespace — `kubectl get applications -n argocd` shows sync/health status for everything. Use this to verify a change actually reconciled after merge; remember local edits do nothing until they land on `main`.

## Workflow: PRs only

Never commit or push directly to `main` — merging to `main` deploys. Branch → push → `gh pr create` → watch CI (`gh pr checks --watch`) → report; the user merges unless they explicitly say otherwise. After merge, verify the ArgoCD sync.

## Operations journal

`notes/plan.md` tracks the active improvement items with statuses; completed items are archived per quarter in `notes/history/YYYY-qN.md`. A PR that completes or advances a plan item updates `notes/plan.md` in that same PR. See `notes/README.md`.

## Commands

- **Lint:** `yamllint .` — run before committing. Config in `.yamllint` extends `default`; `line-length` max is 120 but only a warning.
- **CI gates** (every PR and push to `main`, paths-ignore `*.md`, plus a weekly schedule): yamllint, then a `validate` job that renders every Kustomize overlay and Helm chart and schema-checks the output with kubeconform — strict against the exact Kubernetes version read from `infrastructure/system-upgrade/plans.yaml`, with CRD schemas from the datree CRDs-catalog. Hand-written manifests validate with no escape hatches; Helm renders add `-ignore-missing-schemas` for upstream CR kinds.
- **Render a Kustomize overlay locally** to validate before merge: `kustomize build apps/<app>/envs/production`
- **Render a Helm app locally:** `helm template apps-helm/<app> -f apps-helm/<app>/envs/<env>/values.yaml` (run `helm dependency build apps-helm/<app>` first — upstream charts are declared as dependencies and `Chart.lock`/`charts/` are **not** committed).

## Architecture: App-of-Apps, three levels

1. **Root (`root-argocd-app.yaml`)** — a single ArgoCD `Application` named `all-apps` pointing at `appsets/`. Applying this one file to an empty cluster bootstraps everything.
2. **ApplicationSets (`appsets/`)** — six ApplicationSets, each with a **git directory generator** that auto-discovers apps by directory glob. You almost never edit these.
3. **Applications (`apps/`, `apps-helm/`, `infrastructure-helm/`)** — self-contained Kustomize bases/overlays or Helm umbrella charts. Each is independently deployable without ArgoCD.

**Key consequence:** to add an app you do **not** register it anywhere — you create a directory matching a generator's glob and it is picked up automatically. Each ApplicationSet has its own path/values convention:

| ApplicationSet | Discovers (glob) | Source path used | Values file | Namespace produced |
|---|---|---|---|---|
| `development-applicationset` | `apps/*/envs/development` | that dir (kustomize) | — | `<app>-development` |
| `production-applicationset` | `apps/*/envs/production` | that dir (kustomize) | — | `<app>-production` |
| `development-helm-applicationset` | `apps-helm/*/envs/development` | `apps-helm/<app>/` | `./envs/development/values.yaml` | `<app>-development` |
| `production-helm-applicationset` | `apps-helm/*/envs/production` | `apps-helm/<app>/` | `./envs/production/values.yaml` | `<app>-production` |
| `infrastructure-applicationset` | `infrastructure/*` | that dir (kustomize) | — | `<component>` |
| `infrastructure-helm-applicationset` | `infrastructure-helm/*` | that dir | `./values.yaml` (no env split) | `<component>` |

App name and namespace come from path segments: `{{index .path.segments 1}}-{{index .path.segments 3}}`. So a new dir `apps/myapp/envs/production/` deploys to namespace `myapp-production` with zero other changes. Namespaces are created automatically (`CreateNamespace=true`); there are no namespace manifests in the repo.

Note: `infrastructure/` holds plain-Kustomize infrastructure (e.g. `system-upgrade/`, which drives K3s upgrades — see `docs/upgrades.md`); `infrastructure-helm/` holds the umbrella charts, including self-managed Argo CD and the 1Password operator. `apps-helm/` is currently empty (its appsets stay, discovering nothing until a chart is added).

## Conventions when adding/editing

**Kustomize apps (`apps/<app>/`):** `base/` holds the cross-environment manifests with its own `kustomization.yaml`; `envs/<env>/` overlays reference `../../base` and add or patch. Production overlays typically layer in `ingress.yaml`, `certificate.yaml`, `cloudflared.yaml`, and `onepasswordsecret.yaml`; development overlays often just patch the PVC/service via `patches`.

**Helm apps (`apps-helm/<app>/`, `infrastructure-helm/<component>/`):** these are **umbrella charts** — `Chart.yaml` declares the real upstream chart as a `dependency`, and `templates/` holds only the cluster-specific extras (Ingress, Certificate, OnePasswordItem). Override the upstream chart by nesting under its chart name in values (e.g. `redis:` / `cert-manager:` / `open-webui:` top-level keys). `apps-helm` splits config per environment under `envs/<env>/values.yaml`; `infrastructure-helm` uses a single root `values.yaml`.

**Secrets** are never stored in git. They are pulled by the **1Password Operator** via `OnePasswordItem` CRDs (`apiVersion: onepassword.com/v1`) whose `spec.itemPath` points at `vaults/Kubernetes/items/<item>`.

**TLS / ingress / exposure:** cert-manager issues certs through a Cloudflare DNS-01 `ClusterIssuer` (`cloudflare-clusterissuer`); the Cloudflare API token is itself a `OnePasswordItem`. Public services are exposed via Cloudflare Tunnels (`cloudflared.yaml` per app), not port-forwarding. MetalLB hands out LAN IPs from pool `10.0.10.200-210`; Traefik is the ingress controller; Longhorn provides replicated storage.

**Dependency bumps** (Docker image tags, Helm chart versions) are automated by **Renovate** (`.github/renovate.json`). Its custom regex manager only matches `image: <name>:<tag>` lines in `apps/**/*.yaml`. Prefer letting Renovate PRs handle version updates rather than editing tags by hand.
