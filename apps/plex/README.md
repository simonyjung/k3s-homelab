# Plex Media Server

Plex is a self-hosted media server for streaming movies and TV shows stored on a Network Attached Storage (NAS) device. The official web UI can be accessed at [plex.tv](https://plex.tv).

## Deployment

This configuration runs a single replica of the `lscr.io/linuxserver/plex:latest` Docker image.

### First-Time Setup

A Plex Claim Token is required for the initial setup to link the server to your Plex account.

1.  **Obtain a Claim Token**: Go to [plex.tv/claim](https://plex.tv/claim) to generate a new token. Note that tokens expire approximately 4 minutes after creation.
2.  **Store the Token**: Save the claim token in 1Password under the `PLEX_CLAIM` secret. This is used by the `onepasswordsecret` resource to securely inject the token into the deployment.

## Service Exposure

The Plex application is exposed directly on the node's IP address using `hostNetwork: true`. This improves network performance and resolves client relay issues by making Plex behave as if it were running directly on the host machine.

A headless service (`clusterIP: None`) is used to provide a stable DNS endpoint for the Plex pod within the cluster.

## Prerequisites

### NFS Storage Setup

Before deploying, ensure that NFS permissions are correctly configured on the Synology NAS to allow the Kubernetes nodes to access the media directories.

The NFS directories for media content are mounted using statically provisioned PersistentVolumes, as they are pre-existing shares. For a detailed guide on configuring a Synology NAS for Kubernetes, see this [article](https://medium.com/@bastian.ohm/configuring-your-synology-nas-as-nfs-storage-for-kubernetes-cluster-5e668169e5a2).

### Port Forwarding for Remote Access

To access the Plex server from outside the local network, you must configure port forwarding on your UniFi router.

1.  **Log in** to your UniFi Network Controller.
2.  Navigate to **Settings > Routing & Firewall > Port Forwarding**.
3.  Create a new port forwarding rule with the following settings:

    -   **Name**: `Plex`
    -   **From**: `Any`
    -   **Port**: `32400`
    -   **Forward IP**: `[IP_of_Kubernetes_Node]`
    -   **Forward Port**: `32400`
    -   **Protocol**: `TCP`

**Note**: Replace `[IP_of_Kubernetes_Node]` with the static IP address of the Kubernetes cluster node where the Plex pod is running. The `nodeSelector` in the deployment ensures that the Plex pod is always scheduled on the `amley01` node, so you should use the IP address of that node.
