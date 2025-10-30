# Homepage Application

This directory contains the Kubernetes manifests for deploying [Homepage](https://gethomepage.dev/), a modern, highly customizable application dashboard. We use homelab to provide a publically available service catalog of our homelab. 

It is accessible at [https://home.simonjung.io](https://home.simonjung.io)

# Configuration

The homepage widgets can be configured by editing YAML files under `envs/<environment>/config/`. See [documentation](https://gethomepage.dev/configs/settings/) for configuration options.

# Access

Homepage is exposed publicly via a Cloudflare Tunnel at [https://home.simonjung.io](https://home.simonjung.io).