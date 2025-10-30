# Monitoring

## Overview

This directory contains the Helm chart for deploying a monitoring stack using [Prometheus](https://prometheus.io/) and [Grafana](https://grafana.com/). This chart simplifies the setup of a comprehensive monitoring solution for a Kubernetes cluster, providing insights into the cluster's health and performance.

The [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Helm chart is included as a dependency, and this chart acts as an umbrella chart to manage custom configurations and resources.

Grafana UI: [https://grafana.cluster.simonjung.io](https://grafana.cluster.simonjung.io)

## Features

-   **Prometheus**: A powerful open-source monitoring and alerting toolkit that collects metrics from configured targets at specified intervals.
-   **Grafana**: A leading open-source platform for monitoring and observability, allowing you to visualize and analyze metrics from Prometheus and other data sources.
-   **Alertmanager**: Handles alerts sent by client applications such as the Prometheus server. It takes care of deduplicating, grouping, and routing them to the correct receiver integrations.

## Storage

Both Prometheus and Grafana are configured to use `longhorn` as the `storageClassName` for persistent storage, ensuring that data is not lost when a pod is rescheduled or terminated.

-   **Prometheus**: `20Gi` of persistent storage.
-   **Grafana**: `20Gi` of persistent storage.
-   **Alertmanager**: `10Gi` of persistent storage.