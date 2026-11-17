# Oracle Cloud deployment

The production target is one ARM64 Ubuntu 24.04 VM using rootless Podman,
systemd/Quadlet, Caddy, and persistent SQLite data.

## Build images locally or on the VM

Run from the repository root:

```bash
podman build -f apps/backend/Dockerfile -t localhost/songbattle-api:latest .
podman build -f apps/frontend/Dockerfile -t localhost/songbattle-web:latest .
```

Both Dockerfiles are multi-stage and target the ARM64-compatible official Node
and Caddy images used by the Oracle VM.

## Install Quadlet units on the VM

```bash
mkdir -p ~/.config/containers/systemd
mkdir -p ~/songbattle/data
cp infra/quadlet/* ~/.config/containers/systemd/
cp infra/production.env.example ~/songbattle/production.env
chmod 600 ~/songbattle/production.env
```

Fill `~/songbattle/production.env` with the Spotify credentials and the actual
production domain before starting services. Never commit that file.

Reload and start:

```bash
systemctl --user daemon-reload
systemctl --user enable --now songbattle-api.service
systemctl --user enable --now songbattle-web.service
```

Inspect:

```bash
systemctl --user status songbattle-api.service songbattle-web.service
podman ps
curl http://127.0.0.1/api/health
```

## Domain and privileged ports

The web Quadlet publishes port 80. Rootless Podman may require the host policy
to permit unprivileged binding to ports below 1024. Configure that explicitly
on the VM only after confirming the domain and deployment plan:

```bash
sudo sysctl net.ipv4.ip_unprivileged_port_start=80
echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee /etc/sysctl.d/99-songbattle-ports.conf
sudo sysctl --system
```

The web unit publishes both 80 and 443 and persists Caddy certificates under
`~/songbattle/caddy-data` and `~/songbattle/caddy-config`. Do not expose
production until DNS, HTTPS, backups, and rollback have been verified.
