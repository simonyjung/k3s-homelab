<div align="center">

<img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/kubernetes-light.svg" align="center" width="144px" height="144px"/>

<!-- markdownlint-disable no-trailing-punctuation -->

### A Kubernetes Homelab Repository

_... powered by K3s and ArgoCD_ 

</div>

<div align="center">
    <a href="https://argo-cd.readthedocs.io/en/stable/" target="_blank">
        <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/argo-cd.svg" align="center" width="25px" height="25px"/>
    </a>
    <a href="https://k3s.io/" target="_blank">
        <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/rancher-k3s.svg" align="center" width="25px" height="25px"/>
    </a>
    <a href="https://longhorn.io/" target="_blank">
        <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/rancher-longhorn.svg" align="center" width="25px" height="25px"/>
    </a>
    <a href="https://developer.1password.com/docs/k8s/operator/">
        <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/1password.svg" align="center" width="25px" height="25px"/>
    </a>
</div>

---

# k3s-homelab

A fully declarative, GitOps-driven homelab platform designed to emulate real-world production environments with modern DevOps and Platform Engineering best practices.

This project uses an [App of Apps](https://medium.com/containers-101/how-to-structure-your-argo-cd-repositories-using-application-sets-1150e75d05b3) pattern to bootstrap an empty cluster into a fully functional, observable, and self-healing Kubernetes environment.

Check out the publically available [service catalog/homepage](https://home.simonjung.io).

---

## Overview

This homelab serves as both a learning platform and a production environment for my personal use.

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

## Dependency Management

This repository uses [Renovate](https://github.com/renovatebot/renovate) to automatically update dependencies of Docker images, and Helm charts. The configuration is managed in the [`.github/renovate.json`](./.github/renovate.json) file.

---

## Hardware

The k3s cluster is comprised of 3 cost-effective and energy-efficient MiniPCs. The home network is managed by a Ubiquiti Cloud Gateway Ultra. Off-cluster storage for media is provided by a Synology NAS.

| Device                       | Count | Disk Size | RAM  | Operating System   | Notes                          |
| ---------------------------- | ----- | --------- | ---- | ------------------ | ------------------------------ |
| GMKtec Mini PC NucBox G5 N97 | 3     | 256GB     | 12GB | Fedora Server 43   | k3s master + worker nodes      |
| Framework Desktop            | 1     | 1TB       | 32GB | Fedora Server 43   | GPU worker node                |
| Synology NAS - DS923+        | 1     | 24TB      | 4GB  |                    | NFS volumes for existing media |
| Ubiquiti Cloud Gateway Ultra | 1     |           |      |                    | Network management             |

---

## Repository Structure

<div align="center">
    <img src="./docs/assets/3-level-structure.png" width="50%">
</div>


The repository follows a 3-level structure:

Level 1 – Root Application (App-of-Apps):
A single root YAML manifest references all ApplicationSets. Deploying this file bootstraps an empty cluster with every required application in a single step.

Level 2 – ApplicationSets:
ApplicationSets define groups of related applications for a specific environment. They let Argo CD manage multiple apps declaratively without manually creating individual Application resources.

Level 3 – Base Applications:
These are fully self-contained Kustomize or Helm templates. Each can be deployed independently to any cluster without relying on Argo CD.

```
.
├── apps/                  # Level 3
│   ├── cloudflared/
│   ├── homepage/
│   ├── linkding/
│   ├── plex/
│   └── transmission/
├── apps-helm/
│   └── redis/
├── appsets/               # Level 2
├── docs/
├── infrastructure/
├── infrastructure-helm/
│   ├── cert-manager/
│   ├── longhorn-system/
│   └── monitoring/
└── root-argocd-app.yaml   # Level 1
```

- **apps/**: Contains Kubernetes manifests for applications deployed using Kustomize.
- **apps-helm/**: Contains Helm charts for applications.
- **appsets/**: Contains ArgoCD ApplicationSets for managing applications across different environments.
- **docs/**: Contains documentation for the project.
- **infrastructure/**: Contains Kubernetes manifests for infrastructure components.
- **infrastructure-helm/**: Contains Helm charts for infrastructure components.
- **root-argocd-app.yaml**: The root ArgoCD application that bootstraps the entire cluster.
