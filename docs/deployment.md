# Deploying Pagehaven

Status: requirements and checklist only. Nothing here has been run against the server. Deployment, DNS changes and any paid service need the owner's explicit approval.

Target host: `alplus-01`, `deploy@15.235.100.32`, OVHcloud VPS, Ubuntu 24.04. It already runs CrabGate, KeySend, PostDeploy and the shared `kamal-proxy` (`crabgate/deploy/README.md`, `keysend/deploy/README.md`).

## How the host is run today

| Convention | Evidence |
|---|---|
| Images are built natively for amd64 on the VPS, never on the Mac. CrabGate and KeySend use the Kamal remote builder. PostDeploy uses `docker buildx build --load` from a source archive on the host | `crabgate/config/deploy.yml`, `keysend/config/deploy.yml`, `postdeploy/rust-web/docs/operations.md` |
| One shared `kamal-proxy` publishes 80 and 443. Nothing else publishes app ports | `crabgate/docs/operations.md` (Hosted service on alplus-01) |
| Ports 80 and 443 accept only Cloudflare addresses. Every public hostname is a proxied Cloudflare record | `keysend/docs/operations.md` (Deployment) |
| CrabGate serves `crabgate.com` and `*.crabgate.com` through `kamal-proxy` with a Cloudflare Origin CA certificate, Full (strict). Kamal does not issue the wildcard. Custom domains are not supported | `crabgate/config/deploy.yml`, `crabgate/docs/operations.md` (Hosted TLS and sessions) |
| PostDeploy does not use the shared proxy. Its own Compose project runs a remote-managed `cloudflared` tunnel container. No host port is published. The app reads the client address from `CF-Connecting-IP` | `postdeploy/rust-web/deploy/compose.candidate.yaml`, `postdeploy/rust-web/docs/operations.md` (Routing) |
| Each app runs as its own UID: CrabGate 10001, KeySend 10002, PostDeploy 10004 | `crabgate/Dockerfile`, `keysend/Dockerfile`, `compose.candidate.yaml` |
| Limits: CrabGate 512 MB / 2 CPU, KeySend 1 GB / 2 CPU, PostDeploy 1 GiB / 1 CPU / 128 pids, its tunnel 256 MB / 0.5 CPU | same files |
| Data lives under `/srv/<app>/`. PostDeploy bounds its data with a dedicated loop-mounted ext4 image | `postdeploy/rust-web/deploy/prepare-volume.sh` |
| Secrets come from Credseal (`config/credentials/production.toml.enc`) unlocked by `CREDSEAL_MASTER_KEY`. Tunnel tokens sit in a root-owned 0600 env file | `crabgate/docs/credentials.md`, `keysend/docs/operations.md`, `postdeploy/rust-web/deploy/prepare-candidate.md` |
| SQLite backups use the online backup API, are encrypted with `age` and uploaded with `rclone` to R2 bucket `ovh-alplus-01-backups/<app>/`. Litestream is not used on this host | `keysend/deploy/backup.sh`, `crabgate/docs/operations.md` (Hourly consistent SQLite backups) |
| Releases never stop, restart or prune another app or the proxy. Operators compare other containers' identities before and after | `crabgate/AGENTS.md`, `keysend/AGENTS.md` |

## Recommended shape

Follow the PostDeploy pattern: a separate Compose project `pagehaven` with two services, `app` and `tunnel`, built on the host.

Reasons, all from the constraints above:

- The shared `kamal-proxy` and its config stay untouched. No other app's route can be affected.
- Pagehaven spans two Cloudflare zones (app domain and user-content domain). An Origin CA certificate is issued within one zone, while Kamal takes one `ssl` certificate per app. A tunnel needs no origin certificate.
- Pagehaven's health check and every route depend on the `Host` header. `kamal-proxy` health checks reach the container by address, so `Host` is not the app host. `src/app.rs` then answers 404 (`Host::Invalid`). A Compose health check can send the right `Host`.
- Behind Cloudflare and `kamal-proxy`, the last `X-Forwarded-For` entry would be a Cloudflare edge address (inferred from Kamal's proxy docs: headers are not forwarded when TLS is on). Rate limits would then key on shared Cloudflare addresses.

The alternative is a Kamal app behind the shared proxy, like CrabGate. It needs code changes first (health route that ignores `Host`, `BINDING` from env, client address from `CF-Connecting-IP`) and a solution for two certificate zones. Use it only if the owner prefers one release tool for all Kamal apps.

## 1. Inspect the host first

All commands are read-only. Run them as `deploy` with `sudo` where shown. Record each value in the deploy notes before choosing sizes.

| Check | Command | Record |
|---|---|---|
| OS and kernel | `cat /etc/os-release; uname -r` | Version |
| CPU | `nproc; lscpu \| grep -E 'Model name\|^CPU\(s\)'` | vCPU count |
| Load | `uptime; cat /proc/pressure/cpu` | 1/5/15 min load, CPU pressure |
| Memory | `free -h; swapon --show; cat /proc/pressure/memory` | Total, available, swap, pressure |
| Disk | `df -h / /srv; df -i /srv; sudo du -sh /srv/*` | Free GiB on `/srv`, inodes, per-app use |
| Loop volumes | `losetup -a; findmnt -t ext4` | Existing dedicated volumes |
| Listening ports | `sudo ss -ltnup` | Every bound port and owner. Expect only 22, 80, 443 public |
| Firewall | `sudo ufw status verbose; sudo nft list ruleset \| head -80` | How 80/443 are limited to Cloudflare |
| Docker | `docker info --format '{{.ServerVersion}} cgroup v{{.CgroupVersion}}'; docker compose version` | Versions |
| Containers | `docker ps --format '{{.ID}} {{.Names}} {{.Image}} {{.Status}}'` | IDs of every container. Keep for the before/after comparison |
| Container limits | `docker inspect --format '{{.Name}} mem={{.HostConfig.Memory}} cpu={{.HostConfig.NanoCpus}} pids={{.HostConfig.PidsLimit}} user={{.Config.User}}' $(docker ps -q)` | Sum of memory limits versus total RAM |
| Live use | `docker stats --no-stream` | Actual memory and CPU per container |
| Shared proxy routes | `docker exec kamal-proxy kamal-proxy list` | Hosts already claimed. None may overlap Pagehaven's |
| Networks | `docker network ls` | Name `pagehaven` must be free |
| UIDs and paths | `getent passwd \| awk -F: '$3>=10000'; ls -ln /srv` | Proposed UID 10005 and `/srv/pagehaven` are free. 10003 is not documented anywhere |
| Timers and cron | `systemctl list-timers --all; ls /etc/cron.d` | Backup schedules (KeySend :17, CrabGate hourly). Pick a different minute |
| Tools | `command -v age rclone sqlite3 python3 flock` | Present or missing |

Not determinable from the repositories: VPS size, RAM, disk, swap, firewall implementation, Docker version, whether UID 10003 is taken, and what else runs outside these three apps.

## 2. Domains and TLS

Pagehaven needs an app domain and a separate registrable user-content domain, for example `pagehaven.app` and `pagehaven.site`. `src/settings.rs` always refuses an app origin inside a user-content domain. It also rejects app and user-content hosts whose last two labels match (for example `pagehaven.com` with `sites.pagehaven.com`, or `app.pagehaven.com` with `preview.pagehaven.com`). This conservative check is not a full Public Suffix List lookup; `localhost` is treated as a public suffix, so development hosts such as `app.localhost`, `sites.localhost` and `preview.localhost` work.

Why: imported sites run arbitrary JavaScript. On a different registrable domain they cannot read app cookies or storage, and the browser treats them as cross-site (`docs/architecture.md`, `docs/threat-model.md`).

DNS records, all proxied by Cloudflare:

| Name | Target |
|---|---|
| `pagehaven.app` | tunnel (`<tunnel-id>.cfargotunnel.com`) |
| `*.pagehaven.site` | tunnel |
| `*.preview.pagehaven.site` | tunnel |

Submit `pagehaven.site` and `preview.pagehaven.site` to the Public Suffix List. Both entries matter. With only `pagehaven.site` listed, every preview would share the site `preview.pagehaven.site`, and one preview's script could set cookies for another. PSL inclusion takes weeks, so submit early. Only after both user-content domains are actually listed may you set `settings.user_content_on_public_suffix: true` to allow a shared last-two-label suffix with the app. The setting defaults to false and is an operator acknowledgement, not an automatic PSL lookup. A separate registrable app domain remains the default.

With `secure_cookies: true`, sessions use `__Host-ph_session` with Secure, Path=/ and no Domain attribute, preventing sibling hosts from tossing a parent-domain session cookie. Local HTTP development keeps `ph_session` with `secure_cookies: false`. Enabling secure cookies invalidates existing unprefixed sessions; owners sign in again.

Edge certificates:

- `pagehaven.app` and `*.pagehaven.site` are covered by Cloudflare Universal SSL, free.
- `*.preview.pagehaven.site` is a second-level wildcard. Universal SSL does not cover it. Options: Cloudflare Advanced Certificate Manager on the `pagehaven.site` zone (paid, monthly), or a third registrable domain for previews such as `pagehaven-preview.site` whose one-level wildcard Universal SSL covers (registration fee). Recommendation: the separate preview domain. It costs less and isolates previews from published sites the same way. Both need owner approval.
- No origin certificate is needed with the tunnel. With the Kamal alternative, mirror CrabGate: Origin CA certificates, Full (strict), and an owner who tracks their expiry.

Custom domains. The app exposes `GET /internal/tls/allowed?domain=` for Caddy `on_demand_tls { ask ... }`. This host cannot use it today. Port 443 accepts only Cloudflare and belongs to the shared `kamal-proxy`, which has no on-demand TLS. Options:

1. Launch without custom domains, as CrabGate does. Recommended for the first deployment. The domain screen currently tells users to point an A record at `PAGEHAVEN_SERVER_IPV4`, which would not work here. Hide or disable it (code change).
2. Cloudflare for SaaS on the `pagehaven.site` zone. Customers CNAME their hostname to a Pagehaven target, Cloudflare issues the certificate and sends traffic through the tunnel. First 100 hostnames free, then $0.10 each per month. Needs owner approval, a scoped API token, and code that registers a hostname after TXT verification. The `ask` endpoint is not used. Recommended follow-up.
3. A dedicated Caddy with on-demand TLS. It needs public 80/443 reachable from any address, which conflicts with the current firewall and the shared proxy. It would need a second OVH IPv4 (paid) and a firewall change. Not recommended.

`/internal/tls/allowed` answers on every host, including public ones. Block it at Cloudflare with a custom rule (path equals `/internal/tls/allowed`) unless option 3 is chosen.

## 3. Runtime

| Item | Requirement |
|---|---|
| Image | New `Dockerfile` (does not exist yet): Rust build stage, `debian:bookworm-slim` runtime, `assets/` (templates, `static/`, compiled JS) and `config/`, `curl` for the health check, `USER 10005`. Label `org.opencontainers.image.revision` like KeySend |
| Build | On the host from a clean source archive of a pushed commit, `docker buildx build --platform linux/amd64 --load`, two Cargo jobs (PostDeploy release step 3, KeySend `Dockerfile`) |
| Process | One `pagehaven-cli start --environment production`. One container, never scaled. The import semaphore, rate limits and project locks are in-process |
| User | UID/GID 10005, `read_only: true`, `cap_drop: [ALL]`, `no-new-privileges`, `init: true`, `tmpfs /tmp` 64m |
| Network | No published ports. `tunnel` uses `network_mode: service:app`, so it reaches the app on `127.0.0.1:5150` and `binding: 127.0.0.1` in `config/production.yaml` stays as is. Verify this in the dry run |
| No Docker socket | Neither container mounts `/var/run/docker.sock` |
| Limits | `app`: `mem_limit: 512m`, `memswap_limit: 512m`, `cpus: 1.0`, `pids_limit: 128`. `tunnel`: 256m, 0.5 CPU, as PostDeploy. 512 MB covers two concurrent jobs (`limits.concurrent_jobs: 2`) streaming 25 MB uploads. Adjust only after the inspected free RAM and the sum of other limits are known. Check `memory.swap.max` as PostDeploy does, since swap was not disabled there |
| Data volume | Dedicated ext4 loop image like `prepare-volume.sh`, mounted at `/srv/pagehaven/data`, owner 10005, bound to `/data`. 10 GiB to start, only if `/srv` keeps at least twice that free. Blobs and releases must share one filesystem because releases are hard links |
| Logs | JSON to stdout. `logging: json-file`, `max-size: 10m`, `max-file: 3`. Read with `docker logs pagehaven-app-1` |
| Restart | `restart: unless-stopped` |
| Health check | `curl -fsS -H 'Host: pagehaven.app' http://127.0.0.1:5150/_ping` every 30 s |

Environment (from `config/production.yaml`):

| Variable | Value |
|---|---|
| `PAGEHAVEN_APP_ORIGIN` | `https://pagehaven.app` |
| `PAGEHAVEN_SITES_DOMAIN` | `pagehaven.site` |
| `PAGEHAVEN_PREVIEW_DOMAIN` | `preview.pagehaven.site`, or the separate preview domain |
| `PAGEHAVEN_DATA_DIR` | `/data/files` |
| `DATABASE_URL` | `sqlite:///data/db/pagehaven.sqlite?mode=rwc` |
| `PAGEHAVEN_SECRET` | secret, at least 32 bytes |
| `PAGEHAVEN_SERVER_IPV4` | required by settings. Only shown to users for custom domains. Leave the real IP out until option 2 or 3 exists |
| `PORT` | unset (5150) |

Secrets. The siblings use Credseal. Pagehaven has no Credseal integration yet. Until it does, put `PAGEHAVEN_SECRET` in `/srv/pagehaven/secrets/app.env` (root, 0600, `env_file`), and the tunnel token in `/srv/pagehaven/tunnel.env` (root, 0600), as PostDeploy stores its token. Generate the secret off the host and keep a recovery copy off the host. Rotating it invalidates open preview links. Moving to Credseal is a later code change.

## 4. Proxy and edge changes

With the recommended shape, the shared `kamal-proxy` is not changed at all. Changes are additive and Pagehaven-only:

- A new remote-managed tunnel `pagehaven` with three public hostnames, each to `http://127.0.0.1:5150`. Do not set an HTTP Host header override. Pagehaven routes by the original `Host`.
- The DNS records in section 2.
- A Cloudflare custom rule blocking `/internal/tls/allowed`.

Request body: imports allow 25 MiB (`limits.upload_bytes`). The app enforces this itself with `DefaultBodyLimit` in `src/controllers/api.rs`. Cloudflare's edge limit is 100 MB on Free and Pro, so uploads pass. With the Kamal alternative, set `proxy.buffering.max_request_body: 27000000` (Kamal's default is 1 GB) and confirm imports finish inside the 30 s `response_timeout`.

Client address: `src/controllers/pages.rs` uses the last `X-Forwarded-For` entry. Through the tunnel this should be the visitor address set by Cloudflare. This is not verified. If it is not, read `CF-Connecting-IP` as PostDeploy does. That is safe only because no other path reaches the app.

## 5. Backups, disk and logs

Reuse KeySend's `deploy/backup.sh` for the database. It takes `DB_PATH`, `BACKUP_NAME`, `AGE_RECIPIENT` and `RCLONE_REMOTE`, makes an online `.backup`, checks integrity, encrypts with `age` and uploads hourly and daily copies.

- Database: `DB_PATH=/srv/pagehaven/data/db/pagehaven.sqlite`, `BACKUP_NAME=pagehaven`, destination `ovh-alplus-01-backups/pagehaven/`. Cron in `/etc/cron.d/pagehaven-backup` at a minute other than :17, with `flock`, like `keysend/deploy/keysend-backup.cron`.
- Files: the database alone cannot restore sites. A second script (not written yet) must archive `data/files/blobs`, `archives` and `releases` with `tar`, which keeps hard links, then `age` and `rclone` it daily. Exclude `tmp/`. Run it after the database snapshot. Blobs are only added, so the files are then a superset of what the snapshot names.
- Retention: needs separate owner approval for R2 lifecycle rules, as KeySend got (48 h hourly, 30 days daily).
- Restore: KeySend `deploy/restore.sh` into a new path, never over live data. Run one isolated restore before enabling the cron job.
- Keys: the `age` private identity and `PAGEHAVEN_SECRET` stay off the host.

Disk: watch `df -h /srv/pagehaven/data` and `du -sh /srv/pagehaven/data/files/*`. The loop volume is the hard limit. Pagehaven has a per-project limit (100 MB) and a project count limit, but no per-user or total quota. Alert at 80 % full.

Logs: `docker logs pagehaven-app-1` and `docker logs pagehaven-tunnel-1`. Rotation by the json-file driver.

## 6. Dry-run verification and rollback

Before the first start, record the IDs of all containers (section 1).

After start:

1. `docker compose -f /srv/pagehaven/compose.yaml ps` shows `app` healthy, `docker inspect` shows no `OOMKilled` and the expected user.
2. `sudo ss -ltnup` shows no new public port.
3. `curl -sSI https://pagehaven.app/_ping` returns 200.
4. In a browser: sign up, import `fixtures/zips/harbor-bakery.zip`, edit a heading, publish, open `https://<slug>.pagehaven.site/`. `scripts/smoke.sh` only works against a local `http://` origin. It needs changes before it can target production.
5. Headers. App: CSP and `Set-Cookie: ph_session` with `Secure; HttpOnly; SameSite=Lax`. Site: `X-Content-Type-Options: nosniff`, a referrer policy, no `Set-Cookie`. Preview: `Referrer-Policy: no-referrer`, `frame-ancestors` naming only the app origin, no `Set-Cookie`.
6. A POST to a site host returns 405. A request to `https://pagehaven.site/` (bare domain) returns 404.
7. `https://pagehaven.app/internal/tls/allowed?domain=x` is blocked at the edge.
8. Confirm which client address the rate limiter sees (needs a log line or test, not yet available).
9. The other containers have the same IDs and status as before. CrabGate, KeySend and PostDeploy answer their own readiness URLs.

Rollback never touches other apps:

- Take a database backup before each release. `auto_migrate: true` runs migrations at start, and an older image does not reverse them.
- Bad release: `docker compose -f /srv/pagehaven/compose.yaml stop app`, set the image back to the previous digest, `up -d --no-deps --wait app`. Restore the backup into a new path only with approval.
- Full withdrawal: stop the `pagehaven` project, delete its tunnel hostnames. Never stop, restart or prune `kamal-proxy` or other containers. Never run `docker system prune`.

## 7. Not done, needs the owner

- Approval to deploy at all, and the choice between the tunnel shape and the Kamal shape.
- Buying or choosing the domains, adding Cloudflare zones, DNS records, and the PSL submission.
- Preview TLS: Advanced Certificate Manager (paid) or a separate preview domain (registration fee).
- Custom domains: launch without them, or Cloudflare for SaaS (beyond 100 hostnames paid) with code work.
- A Cloudflare tunnel and its token, and R2 credentials and an `age` key for Pagehaven backups.
- Code work before deployment: `Dockerfile`, Compose file, hiding the custom domain screen, a file backup script, a production smoke script, and possibly reading `CF-Connecting-IP`.
- `docs/threat-model.md` says limits come "from systemd". On this host they would come from Docker. Update that line when the shape is chosen.
