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
cp "$source_dir/compose.yml" compose.yml
cp "$source_dir/backup.sh" backup.sh
chmod 700 backup.sh
docker compose config --quiet
docker compose pull
docker compose up -d --wait --wait-timeout 180
printf '%s\n' "$1" > deployed-commit
curl --fail --retry 6 --retry-delay 5 https://my.ovvesley.com/info
REMOTE
