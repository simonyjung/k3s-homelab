# Policy auditing (Kyverno)

Chart: [`infrastructure-helm/kyverno/`](../infrastructure-helm/kyverno/).
[Kyverno](https://kyverno.io/) evaluates policies against everything in
the cluster and records violations as `PolicyReport` CRs — a live
compliance inventory. **Everything runs in Audit mode: no policy ever
blocks admission.** Promoting a policy to Enforce is a deliberate,
per-policy decision (see the roadmap below), not a default.

## What is deployed

- **Pod Security Standards "baseline"** — the official
  `kyverno-policies` chart (11 ClusterPolicies: no privileged
  containers, no hostPath/hostNetwork surprises, no added capabilities,
  etc.).
- **Two custom policies** in the umbrella chart's `templates/`:
  - `disallow-latest-tag` — untagged or `:latest` images defeat
    Renovate-driven pinning and make rollbacks ambiguous.
  - `require-requests` — pods without CPU/memory requests are invisible
    to scheduler bin-packing and evicted first under pressure.
- Background scans are enabled, so *existing* workloads are evaluated
  continuously — not just new admissions.
- The cleanup controller is disabled (cleanup policies are unused).

## Why a down Kyverno can never break the cluster

A policy engine is an admission webhook, and the cluster has already
learned this lesson once: a down `failurePolicy=Fail` webhook
(cert-manager's) blocks every production sync. Two independent
guarantees prevent a repeat:

1. `features.forceFailurePolicyIgnore.enabled: true` — the engine forces
   every webhook it generates to `failurePolicy=Ignore`.
2. `failurePolicy: Ignore` on the `kyverno-policies` chart — its
   **default is `Fail`, even for Audit-mode policies**.

If Kyverno is down, the only symptom is stale reports.

## Reading the reports

```bash
# per-namespace pass/fail summary
kubectl get policyreports -A

# only the resources with failures, with counts
kubectl get polr -A -o json | jq -r '
  .items[] | select(.summary.fail > 0) |
  "\(.metadata.namespace)\t\(.scope.kind)/\(.scope.name)\tfail=\(.summary.fail)"'

# what exactly failed for one workload
kubectl get polr -n <namespace> <report-name> -o yaml
```

Cluster-scoped resources land in `clusterpolicyreports` (`cpolr`).
Reports appear a few minutes after install (first background scan) and
refresh continuously.

## Roadmap: audit → fix → enforce

1. **Read the inventory for a week.** Expect plenty of findings — most
   apps predate any `securityContext`, and upstream components violate
   baseline *by design* (Longhorn is legitimately privileged).
2. **Fix owned apps app-by-app** via normal PRs (add `securityContext`,
   resource requests).
3. **Exclude by-design violators** with `exclude` blocks on the relevant
   policies rather than living with permanent red.
4. **Only then flip individual policies to Enforce**, starting with ones
   that can only ever match this repo's own manifests. Enforce turns the
   webhook consequences back on — revisit the failure-policy settings
   above when that day comes.

## Adding a policy

Drop a `ClusterPolicy` into
[`infrastructure-helm/kyverno/templates/`](../infrastructure-helm/kyverno/templates/)
following the shape of the existing two: `background: true` on the spec,
`failureAction: Audit` + `allowExistingViolations: true` on each rule.
CI schema-validates it (Kyverno's `ClusterPolicy` is in the CRD
catalog), and the render-diff comment shows exactly what it adds. The
[Kyverno policy library](https://kyverno.io/policies/) is the place to
shop before writing one from scratch.
