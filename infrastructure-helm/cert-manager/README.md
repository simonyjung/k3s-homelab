# Cert-manager

# Usage

To enable secure certificates for an app:

1. Add certificate.yaml

```
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
    name: linkding-ingress-certificate
spec:
    secretName: linkding-ingress-secret
    issuerRef:
        name: cloudflare-clusterissuer
        kind: ClusterIssuer
    dnsNames:
        - linkding.cluster.simonjung.io
```

2. Update ingress.yaml tls to point to the certificate secret

```
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: linkding-ingress
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  rules:
    - host: linkding.cluster.simonjung.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: linkding
                port:
                  number: 3000
  tls:
    - hosts:
        - linkding.cluster.simonjung.io
      secretName: linkding-ingress-secret
```

# Installation

Cert-manager is deployed by ArgoCD as a custom umbrell a helm chart. In addition to cert-manager, a ClusterIssuer using Cloudflare is deployed.

Cloudflare API Token is stored in 1Password and retrieved using the 1Password Secrets operator.

# Documentation
https://cert-manager.io/docs/configuration/
https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
