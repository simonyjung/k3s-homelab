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
Declare a `PersistentVolumeClaim` with `spec.storageClassName: longhorn` to automatically create a `PersistentVolume` backed by a Longhorn volume.

The following example creates a 2Gi volume that can be mounted with `ReadWriteOnce` access mode.

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

## Backups & Snapshots

Longhorn volume backups are located on a Synology NAS at `nfs://192.168.40.118:/volume1/longhorn`.

Snapshots are taken once a day and 7 snapshots are retained.
Backups are taken once a week and 4 backups are retained.

### Restoring a workload's persistent data from a snapshot

Restore from a snapshot if you want to go back in time to a specific point. e.g. Deleted users list and need to revert to a day ago.

1. Scale application deployment down to 0 replicas
2. Within Longhorn UI, attach the now Detached volme to a host with maintenance mode.
3. Revert volume to a snapshot
4. Detach volume from host
5. Scale up application deployment.

### Restoring a workload's persistent data from a backup

Restore from a backup if the volume is gone and unrecoverable, or if you want to restore data to a new volume.

1.  Within the Longhorn UI, navigate to the **Backup** tab.
2.  Find the backup you want to restore and select **Restore**.
3.  Give the new volume a name and specify the desired size.
4.  Once the volume is created, create a new `PersistentVolume` (PV) and `PersistentVolumeClaim` (PVC) to use the restored volume.

    ```yaml
    ---
    apiVersion: v1
    kind: PersistentVolume
    metadata:
      name: <new-pv-name>
    spec:
      capacity:
        storage: <size>
      volumeMode: Filesystem
      accessModes:
        - ReadWriteOnce
      persistentVolumeReclaimPolicy: Retain
      storageClassName: longhorn
      csi:
        driver: driver.longhorn.io
        fsType: ext4
        volumeHandle: <restored-volume-name>
    ---
    apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: <new-pvc-name>
    spec:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: <size>
      storageClassName: longhorn
      volumeName: <new-pv-name>
    ```
5.  Update your application's deployment to use the new PVC.
