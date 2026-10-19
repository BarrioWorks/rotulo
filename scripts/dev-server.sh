#!/usr/bin/env bash
# Restarts a development server on 127.0.0.1:5150 with its data in $1 (default /tmp/pagehaven-dev).
set -euo pipefail
DIR=${1:-/tmp/pagehaven-dev}
cd "$(dirname "$0")/.."
mkdir -p "$DIR"
if [ -f "$DIR/pid" ] && kill -0 "$(cat "$DIR/pid")" 2>/dev/null; then kill "$(cat "$DIR/pid")"; sleep 1; fi
cargo build -q
PAGEHAVEN_DATA_DIR="$DIR/data" DATABASE_URL="sqlite://$DIR/db.sqlite?mode=rwc" setsid nohup target/debug/pagehaven-cli start > "$DIR/server.log" 2>&1 &
echo $! > "$DIR/pid"
for _ in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:5150/_ping && { echo "running, log in $DIR/server.log"; exit 0; }; sleep 0.5; done
echo "server did not start"; tail -20 "$DIR/server.log"; exit 1
