# Monitoring

## Overview

This directory contains the Helm chart for deploying a monitoring stack using [Prometheus](https://prometheus.io/) and [Grafana](https://grafana.com/). The [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Helm chart is included as a dependency, and this chart acts as an umbrella chart to manage custom configurations and resources.

Grafana UI: [https://grafana.cluster.simonjung.io](https://grafana.cluster.simonjung.io)

## Features

-   **Prometheus**: An open-source monitoring and alerting toolkit that collects metrics from configured targets at specified intervals.
-   **Grafana**: An open-source platform for monitoring and observability, allowing you to visualize and analyze metrics from Prometheus and other data sources.
-   **Alertmanager**: Handles alerts sent by client applications such as the Prometheus server. It takes care of deduplicating, grouping, and routing them to the correct receiver integrations.

## Prerequisites

Grafana needs an existing secret for the admin user. By default, name of the secret is `grafana-admin-credentials` and the keys are `admin-user` and `admin-password`.

We use the 1Password operator to create this password.
1. Create or confirm an 1Password item with fields `admin-user` and `admin-password` exists.
2. In `values.yaml`, set `onePasswordSecret.itemPath` to point to the 1Password item. 

`vaults/<vault_name>/items/<item_name>`

ex. `vaults/kubernetes/items/grafana-admin-credentials`


## Storage

Both Prometheus and Grafana are configured to use `longhorn` as the `storageClassName` for persistent storage.

-   **Prometheus**: `20Gi` of persistent storage.
-   **Grafana**: `20Gi` of persistent storage.
-   **Alertmanager**: `10Gi` of persistent storage.