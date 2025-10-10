# Cert-manager

Cert-manager is a native Kubernetes certificate management controller. It can help with issuing certificates from a variety of sources, such as Let's Encrypt, HashiCorp Vault, Venafi, a simple signing key pair, or self signed. It will ensure certificates are valid and up to date, and attempt to renew certificates at a configured time before expiry.

# Installation

Cert-manager is deployed by ArgoCD as a custom umbrella helm chart. In addition to cert-manager, a `ClusterIssuer` using Cloudflare for DNS01 challenges is deployed. This makes it easy to issue certificates for any application in the cluster.

## Prerequisites

The `ClusterIssuer` requires a Cloudflare API Token to be stored as a Kubernetes secret. This is managed by the 1Password Secrets operator. The token is stored in 1Password and synced to the cluster automatically.

# Usage

To enable secure certificates for an application, you need to create a `Certificate` resource and update your `Ingress` resource to use the certificate.

## 1. Create a Certificate

First, create a `certificate.yaml` file for your application. This resource tells cert-manager to issue a certificate and where to store it.

```yaml
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: <app-name>-ingress-certificate
spec:
  secretName: <app-name>-ingress-secret
  issuerRef:
    name: cloudflare-clusterissuer
    kind: ClusterIssuer
  dnsNames:
    - <app-name>.cluster.simonjung.io
```

Replace `<app-name>` with the name of your application.

## 2. Update Ingress

Next, update your `ingress.yaml` to use the secret created by cert-manager. The `secretName` in the `tls` section must match the `secretName` in your `Certificate` resource.

```yaml
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: <app-name>-ingress
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  rules:
    - host: <app-name>.cluster.simonjung.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: <app-name>
                port:
                  number: 80
  tls:
    - hosts:
        - <app-name>.cluster.simonjung.io
      secretName: <app-name>-ingress-secret
```

Replace `<app-name>` with the name of your application and adjust the service port if necessary.

# Documentation

- [Cert-manager Documentation](https://cert-manager.io/docs/configuration/)
- [ACME DNS01 Cloudflare Configuration](https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/)
