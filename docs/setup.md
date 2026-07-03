# Setup

This guide outlines the process for provisioning a new Fedora-based node and adding it to an existing K3s cluster.

> **Note (servers only):** every K3s **server** (`amley00`, `amley01`,
> `amley02`) runs with the built-in klipper load balancer and the bundled
> Traefik chart disabled (`disable: [servicelb, traefik]` in
> `/etc/rancher/k3s/config.yaml`) — MetalLB owns `LoadBalancer` services
> and Traefik is deployed by ArgoCD instead. If a server is ever rebuilt,
> reapply this before starting K3s — see
> [load-balancing.md](./load-balancing.md). Agent nodes need nothing.

> **Every node** also gets automatic security updates with a staggered
> weekly reboot window — apply the dnf5-automatic config from
> [node-updates.md](./node-updates.md) as the final provisioning step,
> choosing an unused weekday.

## Adding a node to the cluster

## Prerequisites

Before adding a new node, ensure you have the following:

- **K3s Server IP/Hostname**: The network address of an existing server node (e.g., `10.0.10.20`).
- **K3s Node Token**: A security token for joining the cluster.

To retrieve the node token, SSH into any K3s server node and read the token file:

```bash
# SSH into a server node
ssh amley00

# Read the node-token file
sudo cat /var/lib/rancher/k3s/server/node-token
```

## Node Installation

1.  **Provision the Node**: Install Fedora Server on a new machine, creating an admin user named `fedora`. Ensure the node has a unique hostname and is on the `10.0.10.0/24` network.

2.  **System Update and Hostname**: Update packages and set the hostname.

    ```bash
    sudo dnf update -y
    sudo hostnamectl set-hostname <node_hostname>
    ```

3.  **Configure SSH Access**:
    Copy your SSH public key to the new node to enable key-based authentication.

    ```bash
    # Replace with your key and node IP
    ssh-copy-id -i ~/.ssh/your_key.pub fedora@<node_ip>
    ```
    Then, disable password authentication for improved security by editing `/etc/ssh/sshd_config` to ensure the following values are set:

    ```ini
    PubkeyAuthentication yes
    PasswordAuthentication no
    ChallengeResponseAuthentication no
    UsePAM no
    ```
    Finally, apply the changes by restarting the SSH service:
    ```bash
    sudo systemctl restart sshd
    ```

4.  **Disable Firewall**: Turn off the firewall to prevent interference with cluster networking.

    ```bash
    sudo systemctl disable firewalld --now
    ```

5. **Disable Swap**: 

    ```bash
    sudo vim /etc/fstab

    # comment out lines that look like this:
    # /dev/mapper/fedora-swap none swap defaults 0 0
    # UUID=xxxx none swap sw 0 0
    ```

    or if zram swap is used. Check with `swapon --show`

    ```bash
    sudo swapoff -a
    sudo dnf remove zram-generator-defaults
    ```

6.  **Install K3s Agent**: Run the official K3s installation script, substituting `<server_ip>` and `<node_token>` with the values gathered previously.

    ```bash
    # CPU Node
    curl -sfL https://get.k3s.io | K3S_URL=https://<server_ip>:6443 K3S_TOKEN=<node_token> sh -

    # Framework Desktop (GPU node) - extra args go after `sh -s -`;
    # the gpu=amd label is what GPU workloads' nodeSelectors match on
    curl -sfL https://get.k3s.io | K3S_URL=https://<server_ip>:6443 K3S_TOKEN=<node_token> sh -s - --node-label "gpu=amd"
    ```

## Adding a server (control-plane) node

The control plane is **three servers on embedded etcd** (`amley00`,
`amley01`, `amley02`) — the API survives any single node failure, and
etcd takes scheduled snapshots (00:00 and 12:00 host time, retention 5,
in `/var/lib/rancher/k3s/server/db/snapshots` on each server). Keep the
server count **odd**; etcd quorum tolerates one loss out of three.

To (re)join a node as a server instead of an agent, follow steps 1–5
above, then write the server config **before** installing:

```bash
sudo mkdir -p /etc/rancher/k3s
sudo sh -c 'cat > /etc/rancher/k3s/config.yaml <<EOF
server: https://<existing_server_ip>:6443
token: <node_token>
tls-san:
  - 10.0.10.250
disable:
  - servicelb
  - traefik
EOF'
curl -sfL https://get.k3s.io | sudo sh -s - server
```

The `tls-san` entry keeps the API serving cert valid for the
control-plane VIP `10.0.10.250` (kube-vip) — see
[load-balancing.md](./load-balancing.md).

If the node was previously in the cluster under the same hostname
(e.g. after an OS reinstall), first remove its old identity so it can
re-register cleanly:

```bash
kubectl delete node <node_hostname>
# k3s garbage-collects the matching
# kube-system/<hostname>.node-password.k3s secret automatically
```

Verify the join: `kubectl get nodes` shows the node `Ready` with
`control-plane,etcd` roles, and Longhorn volumes return to `healthy`
robustness once replicas rebuild (watch
`kubectl get volumes.longhorn.io -n longhorn-system`).

## For Framework Desktop Nodes

1. Add user to render and video groups.

```bash
sudo usermod -aG render,video fedora
sudo reboot
```


## Additional Resources

- [K3s Installation Requirements](https://docs.k3s.io/installation/requirements)
- [Using a Framework Desktop for local AI](https://frame.work/blog/using-a-framework-desktop-for-local-ai)
