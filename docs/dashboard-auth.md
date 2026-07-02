# Dashboard Authentication

The Longhorn UI (`longhorn.cluster.simonjung.io`) and the Traefik dashboard
(`traefik.cluster.simonjung.io`) sit behind HTTP basic auth. They have no
login of their own (unlike ArgoCD and Grafana), and the Longhorn UI can
delete volumes, so they must not be open on the LAN.

## How it works

Each namespace has a Traefik `Middleware` (`dashboard-auth`, basicAuth type)
pointing at a `dashboard-basic-auth` secret, which the 1Password operator
materializes from a **single shared 1Password item**:

- **Item:** `vaults/Kubernetes/items/dashboard-basic-auth`
- **Field:** `users` — one or more htpasswd lines (`user:$apr1$...`),
  newline-separated for multiple users

Wiring, per dashboard:

- **Longhorn** (`infrastructure-helm/longhorn-system/`): the Ingress carries
  `traefik.ingress.kubernetes.io/router.middlewares: longhorn-system-dashboard-auth@kubernetescrd`
- **Traefik** (`infrastructure-helm/traefik/`): the dashboard IngressRoute
  references the middleware via `ingressRoute.dashboard.middlewares` in
  values

The password never appears in git or the cluster manifests — only the
1Password item holds it (as a hash).

## Changing the password / adding users

1. Generate a new htpasswd line locally (not inside a recorded session):

   ```bash
   echo "admin:$(openssl passwd -apr1 'NEW_PASSWORD')"
   # or: htpasswd -nb admin 'NEW_PASSWORD'   (dnf install httpd-tools)
   ```

2. Replace (or append to) the `users` field of the `dashboard-basic-auth`
   item in 1Password.
3. Wait for the operator's polling interval (10 minutes), or force an
   immediate sync:

   ```bash
   kubectl rollout restart deploy/onepassword-connect-operator -n 1password
   ```

4. Confirm both secrets picked up the new item version (bumps by 1 per
   edit):

   ```bash
   kubectl get secret dashboard-basic-auth -n longhorn-system -n traefik \
     -o jsonpath='{.metadata.annotations.operator\.1password\.io/item-version}'
   ```

Traefik reads the secret dynamically — no restarts needed; the new
credentials apply to the next request.

## Troubleshooting

- **401 with correct credentials:** the secret may not have synced yet
  (check the item-version annotation above), or the `users` value is not a
  valid htpasswd line.
- **500 from the dashboard:** the middleware exists but its secret is
  missing — check the `OnePasswordItem` status in that namespace and the
  operator logs in `1password`.
- Protecting another Ingress: add a `Middleware` + `OnePasswordItem` pair
  to its chart (copy from `infrastructure-helm/longhorn-system/templates/`)
  and annotate the Ingress with
  `<namespace>-dashboard-auth@kubernetescrd`.
