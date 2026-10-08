#!/usr/bin/env bash
set -euo pipefail
cd /opt/projects/affine
umask 077
exec 9>/opt/projects/affine/backup.lock
flock -n 9 || exit 0
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dest="backups/$stamp"
mkdir -p "$dest"
# Pause writers so database and blobs belong to the same snapshot.
container=$(docker compose ps -q affine)
test -n "$container"
docker stop "$container" >/dev/null
trap 'docker start "$container" >/dev/null' EXIT
docker compose exec -T --interactive=false postgres pg_dump -U affine -d affine -Fc > "$dest/database.dump"
tar -czf "$dest/files.tar.gz" config data/storage .env compose.yml gateway
chmod -R go-rwx "$dest"
docker start "$container" >/dev/null
trap - EXIT
# Keep the latest 14 completed snapshots.
python3 - <<'PY'
from pathlib import Path
import shutil
p=Path('backups')
for d in sorted([d for d in p.iterdir() if d.is_dir() and (d/'files.tar.gz').exists()],reverse=True)[14:]:
    shutil.rmtree(d)
PY
