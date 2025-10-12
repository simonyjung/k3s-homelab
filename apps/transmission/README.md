# Transmission

This document outlines the deployment of the Transmission BitTorrent client to the homelab Kubernetes cluster.

The Web UI can be accessed when connected to the home network at [https://transmission.cluster.simonjung.io](https://transmission.cluster.simonjung.io)

## Deployment

Transmission is configured to run a single replica of the `lscr.io/linuxserver/transmission:latest` Docker image.

The deployment utilizes three persistent volume claims (PVCs) for data persistence:

-   `transmission-pvc`: Stores the application's configuration files. This PVC is dynamically provisioned by Longhorn.
-   `nfs-downloads-pvc`: Used for storing downloaded files. This PVC is backed by an NFS persistent volume (PV) pointing to a Synology NAS `192.168.40.118:/volume1/media/Downloads`.
-   `nfs-watch-pvc`: A directory for `.torrent` files that Transmission will automatically pick up. This PVC is backed by an NFS PV pointing to `192.168.40.118:/volume1/media/Watch`.

## Service

The application is exposed through a `NodePort` service, which makes the following ports accessible on the cluster nodes:

-   **Web Interface:** Port `9091` (mapped to NodePort `32100`)
-   **Torrent TCP:** Port `51413` (mapped to NodePort `32110`)
-   **Torrent UDP:** Port `51413` (mapped to NodePort `32110`)

## Ingress

The Transmission web interface is made accessible externally via an `Ingress` resource. It is configured to respond to the hostname `transmission.cluster.simonjung.io` and is secured with TLS using the `transmission-ingress-secret` secret.

## Transmission Prerequisites

### NFS Setup
Before deploying, ensure that the NFS permissions are correctly set on the Synology NAS.

[Configuring your synology NAS as NFS Storage](https://medium.com/@bastian.ohm/configuring-your-synology-nas-as-nfs-storage-for-kubernetes-cluster-5e668169e5a2)

### Portforwarding

To access the Transmission service from outside your local network, you will need to configure port forwarding on your UniFi router.

1.  **Log in to your UniFi Network Controller.**
2.  Navigate to **Settings > Policy Table > Port Forwarding**.
3.  Create a new port forwarding rule:

    **Transmission Torrent Port**
    -   **Name:** Transmission Torrent
    -   **From:** Any
    -   **Port:** 51413
    -   **Forward IP:** `[IP_of_Kubernetes_Node]`
    -   **Forward Port:** 32110
    -   **Protocol:** TCP/UDP

Replace `[IP_of_Kubernetes_Node]` with the IP address of one of your Kubernetes cluster nodes.
