# Cloudflared

## Overview

Cloudflared provides a secure way to expose web services running in a private network to the internet, without opening up firewall ports. It creates a persistent outbound-only connection to the Cloudflare network.

## Prerequisites

- A registered domain name on Cloudflare.

## Steps

1.  **Install `cloudflared` CLI**

    Follow the [official installation guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) to install the `cloudflared` command-line tool.

2.  **Login to Cloudflare**

    Authenticate `cloudflared` with your Cloudflare account. This will open a browser window to log in.
    ```bash
    cloudflared tunnel login
    ```

3.  **Create a Tunnel**

    Create a new tunnel with a descriptive name.
    ```bash
    cloudflared tunnel create <tunnel_name>
    ```
    This command will output a tunnel ID and create a credentials file (e.g., `<tunnel_id>.json`) in `~/.cloudflared/`.

4.  **Save Tunnel Credentials to 1Password**

    Upload the contents of the generated JSON credentials file and save it as a password item in 1Password. See this [example](https://start.1password.com/open/i?a=TG2G6YLPWFCLZO3XBOCX5EM57A&v=ev7crwurs2pgxravkvd2wl4gnm&i=twgplwi5cd6jurm5o7jm3wn4am&h=my.1password.com) for the expected format.

5.  **Create a Kubernetes Secret**

    Create a `onepasswordsecret.yaml` file to securely inject the tunnel credentials into your cluster. This manifest will pull the credentials from 1Password and create a Kubernetes secret.

    ```yaml
    # Example: onepasswordsecret.yaml
    apiVersion: onepassword.com/v1
    kind: OnePasswordItem
    metadata:
      name: cloudflared-credentials
    spec:
      itemPath: "vaults/<your_vault>/items/<item_name>"
    ```

6.  **Create a CNAME DNS Record**

    In the Cloudflare dashboard, create a CNAME record for the public hostname you want to use. Point it to your tunnel ID followed by `.cfargotunnel.com`.

    -   **Type**: `CNAME`
    -   **Name**: `your-subdomain` (e.g., `linkding`)
    -   **Target**: `<tunnel_id>.cfargotunnel.com`

7.  **Configure the Cloudflared Deployment**

    Add a Cloudflared sidecar container to your application's deployment manifest. See [`apps/cloudflared/base/deployment.yaml`](apps/cloudflared/base/deployment.yaml) for an example.

    Ensure you update the following fields to match the resources you created:
    -   The secret name (`cloudflared-credentials` in the example above).
    -   The tunnel name (`<tunnel_name>`).
    -   The public hostname (`your-subdomain.your-domain.com`).

## Documentation

[Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)

[Local Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/)
