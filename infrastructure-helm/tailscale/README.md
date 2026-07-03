# tailscale

Remote access to the homelab over [Tailscale](https://tailscale.com), via the
official [Kubernetes operator](https://tailscale.com/docs/kubernetes-operator).

Provides two things:

1. **Subnet router** (`templates/connector.yaml`) — advertises `10.0.10.0/24`
   so any device on the tailnet can reach the LAN: MetalLB VIPs
   (`10.0.10.200` traefik), the kube-vip API VIP (`10.0.10.250`), node SSH,
   and LAN-only ingress (ArgoCD, Longhorn, Grafana).
2. **Kubernetes API server proxy** (`apiServerProxyConfig.mode: "true"`) —
   `kubectl` over the tailnet with Tailscale-identity auth, independent of
   the subnet route.

## Prerequisites (outside git)

These live in the Tailscale admin console and 1Password, not this repo.

### Tailnet ACL policy (admin console → Access controls)

```jsonc
"tagOwners": {
  "tag:k8s-operator": [],
  "tag:k8s": ["tag:k8s-operator"],
},
// auto-approve the subnet route so no console click is needed
"autoApprovers": { "routes": { "10.0.10.0/24": ["tag:k8s"] } },
// let admins hit the K8s API proxy as cluster-admin
"grants": [{
  "src": ["autogroup:admin"],
  "dst": ["tag:k8s-operator"],
  "app": { "tailscale.com/cap/kubernetes": [{ "impersonate": { "groups": ["system:masters"] } }] }
}]
```

### OAuth client (admin console → Settings → OAuth clients)

Scopes `Devices: Core` (write) and `Keys: Auth Keys` (write), tag
`tag:k8s-operator`.

### 1Password item

`vaults/Kubernetes/items/tailscale-operator-oauth` with two fields labeled
exactly `client_id` and `client_secret` — the field labels become the Secret
keys the chart's `oauthSecretVolume` mounts.

## Client usage

- macOS/iOS/Android clients accept advertised routes automatically; on Linux
  run `tailscale up --accept-routes`.
- Remote kubectl via the API proxy:
  `tailscale configure kubeconfig tailscale-operator`. The existing
  kubeconfig against `10.0.10.250` also works over the subnet route.
