# CI and PR validation

Merging to `main` deploys — ArgoCD reconciles whatever lands there. CI is
therefore the only pre-merge safety net, and it is built to answer two
questions before merge instead of after: *is this valid?* and *what will
it actually change?*

## What runs on every PR

| Job | Workflow | Catches |
| --- | --- | --- |
| Lint | [`ci.yaml`](../.github/workflows/ci.yaml) | YAML syntax and style (`yamllint`) |
| Validate rendering | [`ci.yaml`](../.github/workflows/ci.yaml) | overlays/charts that fail to render, plus **schema violations** in the rendered output (kubeconform) |
| Rendered manifest diff | [`render-diff.yaml`](../.github/workflows/render-diff.yaml) | posts a PR comment showing exactly what the cluster will see on merge |

All three skip markdown-only changes (`paths-ignore: '*.md'`). Lint and
Validate also run on every push to `main` and on a weekly schedule.

## Schema validation (kubeconform)

Every `kustomize build` and `helm template` output is piped through
[kubeconform](https://github.com/yannh/kubeconform), so a typo'd field
name or wrong `apiVersion` fails the PR instead of surfacing as an
ArgoCD sync error after deploy.

- **The Kubernetes version is not hardcoded** — it is grep'd from
  [`infrastructure/system-upgrade/plans.yaml`](../infrastructure/system-upgrade/plans.yaml)
  at run time, so validation always targets the exact version the fleet
  runs and follows K3s upgrades automatically (same trick as the README
  k3s badge).
- **Hand-written manifests validate strictly, with no escape hatches**:
  all `apps/*/envs/*` and `infrastructure/*` overlays plus
  `root-argocd-app.yaml` and `appsets/`. Every CRD kind the repo writes
  (OnePasswordItem, Certificate, CNPG Cluster/Pooler, ArgoCD
  Application/ApplicationSet, upgrade Plan, Kyverno ClusterPolicy) has a
  schema in the [datree CRDs-catalog](https://github.com/datreeio/CRDs-catalog).
- **Helm renders** add `-ignore-missing-schemas`, because upstream
  charts emit CR kinds the catalog may not carry.
- `-skip CustomResourceDefinition`: the CRD *kind* schema itself is
  missing from the upstream schema repo, and vendored upstream CRDs gain
  little from validation anyway.

## Rendered manifest diff (the "plan" preview)

[`render-diff.yaml`](../.github/workflows/render-diff.yaml) renders the
whole repo twice — once from the PR merge commit, once from current
`main` — using [`scripts/render-all.sh`](../scripts/render-all.sh),
diffs the two trees, and maintains **one** PR comment (marker-keyed,
updated in place on later pushes): a per-app `+/−` table with the full
diff collapsed below, truncated at 55 KB.

Why it exists:

- A one-line values change can re-render dozens of resources; the diff
  shows the real blast radius, not the source-file delta.
- **It catches the `prune: true` foot-gun.** Every ArgoCD app prunes, so
  a directory rename that stops matching an ApplicationSet glob silently
  *deletes the app from the cluster*. In the diff table that mistake is
  unmissable: the app shows up as `+0 / −N`.

The diff is only useful because renders are **deterministic** — two
renders of the same commit are byte-identical. Keep it that way: avoid
charts (or values) that generate random material at template time
(`randAlphaNum`-style passwords, generated certs); those belong in
1Password / cert-manager anyway.

## Running the same checks locally

Render everything to a directory:

```bash
./scripts/render-all.sh /tmp/rendered
```

Schema-check one overlay the way CI does:

```bash
kustomize build apps/<app>/envs/production | kubeconform -strict -summary \
  -kubernetes-version "$(grep -m1 -oP 'version: v\K[0-9.]+' infrastructure/system-upgrade/plans.yaml)" \
  -skip CustomResourceDefinition \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json'
```

Two Helm gotchas that only bite locally (the CI runner's Helm 3 is
unaffected):

- **Helm 4 no longer auto-fetches "unmanaged" repos** — `helm dependency
  build` fails with `no repository definition for <url>` until you `helm
  repo add` each repository named in the chart's `Chart.yaml`.
- **Stale `Chart.lock` files** from old local renders (gitignored, so a
  fresh checkout never has them) fail dep builds with "lock file is out
  of sync" — `helm dependency update <chart>` fixes it.
