#!/usr/bin/env bash
# Times import and publish over HTTP against a release build, N runs per ZIP, and reports the
# server's memory. Usage: scripts/perf.sh [runs] zip...
set -euo pipefail
RUNS=${1:-7}; shift
cd "$(dirname "$0")/.."
cargo build -q --release
DIR=$(mktemp -d)
PORT=5151
A=http://127.0.0.1:$PORT
PORT=$PORT PAGEHAVEN_APP_ORIGIN=$A PAGEHAVEN_DATA_DIR="$DIR/data" DATABASE_URL="sqlite://$DIR/db.sqlite?mode=rwc" LOG_LEVEL=warn \
  target/release/pagehaven-cli start > "$DIR/server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null "$A/_ping" && break; sleep 0.5; done
rss() { awk '/VmRSS|VmHWM/ {printf "%s %d MB  ", $1, $2/1024}' "/proc/$SERVER/status"; echo; }
echo "idle: $(rss)"
J="$DIR/jar"
curl -s -o /dev/null -c "$J" -b "$J" -H "Origin: $A" --data-urlencode name=Perf --data-urlencode email=perf@example.com --data-urlencode password=correct-horse-battery "$A/register"
errors=0
for ZIP in "$@"; do
  imports=(); publishes=()
  for run in $(seq 1 "$RUNS"); do
    out=$(curl -s -o "$DIR/out" -w "%{http_code} %{time_total}" -c "$J" -b "$J" -H "Origin: $A" -F "file=@$ZIP" "$A/api/imports")
    [ "${out% *}" = 201 ] || { errors=$((errors+1)); echo "import failed: $out $(cat "$DIR/out")"; continue; }
    imports+=("${out#* }")
    pid=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['project']['pid'])" "$DIR/out")
    rev=$(curl -s -b "$J" "$A/api/projects/$pid/editor" | python3 -I -c "import json,sys;print(json.load(sys.stdin)['project']['revision'])")
    out=$(curl -s -o "$DIR/out" -w "%{http_code} %{time_total}" -b "$J" -H "Origin: $A" -H "Content-Type: application/json" --data "{\"base_revision\":$rev}" "$A/api/projects/$pid/publish")
    [ "${out% *}" = 201 ] || { errors=$((errors+1)); echo "publish failed: $out $(cat "$DIR/out")"; continue; }
    publishes+=("${out#* }")
    files=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['release']['file_count'])" "$DIR/out")
    # Delete the project so the per-user project limit never interferes with the runs.
    sqlite3 "$DIR/db.sqlite" "PRAGMA foreign_keys = ON; DELETE FROM projects WHERE pid = '$pid'"
  done
  stats() { printf '%s\n' "$@" | sort -n | awk '{a[NR]=$1} END {printf "median %.0f ms, range %.0f to %.0f ms, n=%d", a[int((NR+1)/2)]*1000, a[1]*1000, a[NR]*1000, NR}'; }
  echo "$(basename "$ZIP") ($files files)"
  echo "  import:  $(stats "${imports[@]}")"
  echo "  publish: $(stats "${publishes[@]}")"
done
echo "after: $(rss)"
echo "errors: $errors"
[ "$errors" = 0 ] || grep -i error "$DIR/server.log" | tail -5
