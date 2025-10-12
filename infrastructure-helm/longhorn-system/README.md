# Longhorn

## Overview

This directory contains the Helm chart for deploying [Longhorn](https://longhorn.io/), a distributed block storage system for Kubernetes. Longhorn is a lightweight, reliable, and easy-to-use storage solution that provides persistent storage for stateful applications running in a Kubernetes cluster. It serves as a replacement for cloud-based storage solutions like AWS Elastic Block Store (EBS) on bare-metal Kubernetes clusters.

The official Longhorn Helm chart is included as a dependency, and this chart acts as an umbrella chart to manage custom configurations and resources.

Web UI: [https://longhorn.cluster.simonjung.io](https://longhorn.cluster.simonjung.io)

## Features

-   **High Availability**: Data is replicated across multiple nodes to ensure high availability and prevent data loss in case of a node failure.
-   **Persistent Storage**: Provides persistent storage for stateful applications, ensuring that data is not lost when a pod is rescheduled or terminated.
-   **Web UI**: A user-friendly web interface for managing volumes, snapshots, and backups.

## Usage
Declare a PersistentVolumeClaim with `spec.storageClassName: longhorn` to automatically create a PersistentVolume backed by a longhorn volume.

```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: linkding-pvc
spec:
  storageClassName: longhorn
  resources:
    requests:
      storage: 2Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
```

## TODO

-   [ ] Back up to Synology NAS