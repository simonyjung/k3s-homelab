<div align="center">

<img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/kubernetes-light.svg" align="center" width="144px" height="144px"/>

<!-- markdownlint-disable no-trailing-punctuation -->

### A Kubernetes Homelab Repository

_... managed with ArgoCD_ 

</div>

<div align="center">
    <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/argo-cd.svg" align="center" width="20px" height="20px"/>
    <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/rancher-k3s.svg" align="center" width="20px" height="20px"/>
    <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/rancher-longhorn.svg" align="center" width="20px" height="20px"/>
    <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/1password.svg" align="center" width="20px" height="20px"/>
</div>

---

# k3s-homelab

A fully declarative, GitOps-driven homelab platform designed to emulate real-world production environments with modern DevOps and Platform Engineering best practices.

This project uses an [App of Apps](https://medium.com/containers-101/how-to-structure-your-argo-cd-repositories-using-application-sets-1150e75d05b3) pattern to bootstrap an empty cluster into a fully functional, observable, and self-healing Kubernetes environment.

---

## Overview

This homelab serves as both a learning platform and a production environment for my personal use, demonstrating the management of Kubernetes clusters through GitOps workflows.

Goals:

- Reproducible and declarative cluster management
- Modular architecture mirroring cloud-native infrastructure

---

## Platform Capabilities

- Declarative Infrastructure - Everything is Git-versioned and reproducible.
- GitOps Automation - ArgoCD continously reconciles desired vs live state.
- Zero-Trust Networking - Cloudflare Tunnels to expose services without port forwarding.
- Resilient Storage - Longhorn provides replication and snapshot recovery.
- External Secrets - 1Password Operator manages Kubernetes secrets securely.
- Observability - Prometheus and Grafana provide system-level insights.

---

## Hardware

The k3s cluster is comprised of 3 cost-effective and energy-efficient MiniPCs. The home network is managed by a Ubiquiti Cloud Gateway Ultra. Off-cluster storage for media is provided by a Synology NAS.

| Device                       | Count | Disk Size | RAM  | Operating System   | Notes                          |
| ---------------------------- | ----- | --------- | ---- | ------------------ | ------------------------------ |
| GMKtec Mini PC NucBox G5 N97 | 3     | 256GB     | 12GB | Fedora Server 42   | k3s master + worker nodes      |
| Synology NAS - DS923+        | 1     | 24TB      | 4GB  |                    | NFS volumes for existing media |
| Ubiquiti Cloud Gateway Ultra | 1     |           |      |                    | Network management             |

---
