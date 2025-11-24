# Setup

This guide outlines the process for provisioning a new Fedora-based node and adding it to an existing K3s cluster.

## Adding a node to the cluster

## Prerequisites

Before adding a new node, ensure you have the following:

- **K3s Server IP/Hostname**: The network address of the master node (e.g., `10.0.10.20`).
- **K3s Node Token**: A security token for joining the cluster.

To retrieve the node token, SSH into the K3s server node and read the token file:

```bash
# SSH into the server node
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

    # Framework Desktop
    curl -sfL https://get.k3s.io | K3S_URL=https://<server_ip>:6443 K3S_TOKEN=<node_token> --node-label="gpu-amd" sh -
    ```

## For Framework Desktop Nodes

1. Add user to render and video groups.

```bash
sudo usermod -aG render,video fedora
sudo reboot
```


## Additional Resources

- [K3s Installation Requirements](https://docs.k3s.io/installation/requirements)
- [Using a Framework Desktop for local AI](https://frame.work/blog/using-a-framework-desktop-for-local-ai)
