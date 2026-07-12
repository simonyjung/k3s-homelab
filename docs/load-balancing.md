# Load Balancing

How LAN traffic reaches services in the cluster, and why it survives the
loss of any single node.

## The path of a request

```
laptop ──DNS──> *.cluster.simonjung.io = 10.0.10.200 (floating VIP)
       ──TCP──> whichever node currently announces the VIP (MetalLB L2)
       ──kube-proxy──> Traefik ──Ingress rules──> app pod (any node)
```

The wildcard DNS record points at a **virtual IP** owned by MetalLB, not
at any physical node. If the node currently answering for the VIP dies,
MetalLB moves the VIP to a surviving node within ~10 seconds. Public
services are independent of all of this — they enter via Cloudflare
Tunnels (`cloudflared` pods dial out).

## MetalLB (L2 mode)

Chart: [`infrastructure-helm/metallb/`](../infrastructure-helm/metallb/).
One `IPAddressPool` + `L2Advertisement`:

- **Pool:** `10.0.10.200-10.0.10.210`
- L2 mode constraint: the pool **must be inside the LAN subnet**
  (`10.0.10.0/24`) — clients find the VIP via ARP, which never crosses a
  subnet boundary. (An earlier `10.100.111.x` pool was unreachable for
  exactly this reason.)
- The range **must be excluded from the UCG Ultra's DHCP scope**
  (UniFi → Settings → Networks → 10.0.10.0/24 → DHCP range stops below
  `.200`), or DHCP will hand the same addresses to random devices.

Pinned VIPs (via the `metallb.io/loadBalancerIPs` service annotation):

| VIP           | Service                          | Why pinned                          |
| ------------- | -------------------------------- | ----------------------------------- |
| `10.0.10.200` | `traefik/traefik`                | wildcard DNS record points here     |
| `10.0.10.201` | `linkding-development/linkding`  | dev instance, no ingress/DNS name   |

Unpinned future `LoadBalancer` services get the next free address in the
pool automatically.

### Failover characteristics

L2 mode is **active/passive**: one node answers ARP for a VIP and
receives all its traffic (kube-proxy then spreads it to pods on any
node). On node failure the speakers elect a new owner (~10 s) and send
gratuitous ARP so clients update their caches. This is failover, not
load balancing — fine at homelab scale.

## Control-plane VIP (kube-vip)

The Kubernetes API has its own floating VIP, **`10.0.10.250:6443`**,
separate from MetalLB: [kube-vip](https://kube-vip.io) runs as a
DaemonSet on the three server nodes (`infrastructure/kube-vip/`) in ARP
mode, control-plane-only (`svc_enable=false` — MetalLB keeps sole
ownership of `LoadBalancer` services). One server holds the VIP; on
failure another takes it over within a few seconds, same L2
active/passive pattern as MetalLB above. Kubeconfigs point at the VIP
instead of a node IP, so the API stays reachable through any single
server outage.

Two host-level prerequisites (outside git, like the `disable:` config):

- every server's `/etc/rancher/k3s/config.yaml` carries
  `tls-san: [10.0.10.250]` so the API serving cert covers the VIP;
- `10.0.10.250` must stay outside the UCG DHCP scope and outside the
  MetalLB pool.

Caveat: kube-vip's leader election runs through the Kubernetes API
itself, so if the whole control plane is down the VIP freezes — direct
node IPs (`10.0.10.20/.21/.22:6443`) always work as a fallback.

## klipper servicelb is disabled

K3s ships its own load balancer (klipper `servicelb`, the `svclb-*`
daemonsets that bind service ports on every node's real IP). It is
**disabled** so MetalLB is the single owner of `LoadBalancer` services —
two controllers fighting over the same services is how the VIPs ended up
decorative the first time.

This is node-level config on **every server** (`amley00`, `amley01`,
`amley02` — agents need nothing), the one piece of this design that
lives outside git:

```yaml
# /etc/rancher/k3s/config.yaml on each server
# (traefik is also disabled: ArgoCD deploys its own; local-storage is
# disabled so Longhorn is the sole default StorageClass)
disable:
  - servicelb
  - traefik
  - local-storage
```

applied with `sudo systemctl restart k3s`.

> **If a server is ever rebuilt, this must be reapplied** — otherwise
> klipper comes back and both LBs claim the services. See
> [setup.md](./setup.md).

## Troubleshooting

- **List VIPs:** `kubectl get svc -A | grep LoadBalancer`
- **Which node owns a VIP right now:**

  ```bash
  kubectl logs -n metallb -l app.kubernetes.io/component=speaker --tail=200 \
    | grep announcing
  ```

- **VIP unreachable from LAN:** check the pool is still inside
  `10.0.10.0/24` and DHCP hasn't leased the address to something else
  (UniFi client list). `arping 10.0.10.200` from a LAN host shows who is
  answering.
- **One client can't reach the VIP right after a failover:** stale ARP
  cache; it clears itself, or flush with `ip neigh flush 10.0.10.200`.
- **Service stuck `<pending>` external IP:** pool exhausted, or a pinned
  annotation requests an address outside the pool — check
  `kubectl describe svc` events and the speaker/controller logs in the
  `metallb` namespace.
- **`svclb-*` daemonsets reappear in `kube-system`:** klipper got
  re-enabled (server rebuilt without the config above).
