#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
server="${1:-myserver}"
revision=$(git rev-parse HEAD)
ssh "$server" "test -f /opt/projects/affine/.env && mkdir -p /opt/projects/affine/releases/$revision"
git archive HEAD deploy/myserver | ssh "$server" "tar -x -C /opt/projects/affine/releases/$revision"
ssh "$server" bash -s -- "$revision" <<'REMOTE'
set -euo pipefail
cd /opt/projects/affine
source_dir="releases/$1/deploy/myserver"
./backup.sh
mkdir -p gateway
cp "$source_dir/gateway/server.mjs" gateway/server.mjs
cp "$source_dir/compose.yml" compose.yml
cp "$source_dir/backup.sh" backup.sh
chmod 700 backup.sh
docker compose config --quiet
docker compose pull
docker compose up -d --wait --wait-timeout 180
docker compose restart --no-deps gateway
docker compose up -d --no-deps --wait --wait-timeout 90 gateway
printf '%s\n' "$1" > deployed-commit
curl --fail --retry 6 --retry-delay 5 https://my.ovvesley.com/login
REMOTE
