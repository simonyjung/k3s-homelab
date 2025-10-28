# Cloudflared

## Overview

Cloudflared provides a secure way to expose web services running in a private network to the internet, without opening up firewall ports. It creates a persistent outbound-only connection to the Cloudflare network.

## Prerequisites

- A registered domain name on Cloudflare.

## Documentation

[Official Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/deployment-guides/kubernetes/)

## Steps

1. Install Cloudflared CLI tool
2. Login using `cloudflared tunnel login`
3. Create tunnel `cloudflared tunnel create linkding`. This step will create a json file in ~/.cloudflared with credentials for the tunnel. The name of the json file will be the tunnel_id.
4. Save contents of json credentials to 1Password. See [example](https://start.1password.com/open/i?a=TG2G6YLPWFCLZO3XBOCX5EM57A&v=ev7crwurs2pgxravkvd2wl4gnm&i=twgplwi5cd6jurm5o7jm3wn4am&h=my.1password.com).
5. Create onepasswordsecret.yaml to create a secret based off the contents of the json file.
6. Create a Cloudflare DNS record to point to the tunnel. Select CNAME, <tunnel_id>.cfargotunnel.com
7. Add Cloudflared deployment to the app manifests. See apps/cloudflared/base/deployment.yaml for an example. 
- Change the secret name, tunnel name, and hostname to match resources created in earlier steps.