#!/usr/bin/env bash
# Drives the main journey over HTTP against a running server: register, import, edit, undo,
# publish, view the live site, republish, roll back. Usage: scripts/smoke.sh [app-origin] [zip]
set -euo pipefail
A=${1:-http://127.0.0.1:5150}
ZIP=${2:-$(dirname "$0")/../fixtures/zips/harbor-bakery.zip}
W=$(mktemp -d)
J="$W/jar"
json() { python3 -I -c "import json,sys; d=json.load(open(sys.argv[1])); print(eval(sys.argv[2], {'d': d}))" "$@"; }
call() { # method path [json-body] -> body in $W/out, prints status
  local m=$1 p=$2 b=${3:-}
  if [ -n "$b" ]; then
    curl -s -o "$W/out" -w "%{http_code}" -c "$J" -b "$J" -X "$m" -H "Origin: $A" -H "Content-Type: application/json" --data "$b" "$A$p"
  else
    curl -s -o "$W/out" -w "%{http_code}" -c "$J" -b "$J" -X "$m" -H "Origin: $A" "$A$p"
  fi
}
host_get() { # url -> status, body in $W/page
  local url=$1 hostport=${1#http://}; hostport=${hostport%%/*}
  curl -s -o "$W/page" -D "$W/headers" -w "%{http_code}" --resolve "${hostport%:*}:${hostport##*:}:127.0.0.1" "$url"
}
expect() { [ "$1" = "$2" ] || { echo "FAIL: $3 (got $1, want $2)"; cat "$W/out" 2>/dev/null; echo; exit 1; }; echo "ok   $3"; }

EMAIL="smoke-$RANDOM$RANDOM@example.com"
s=$(curl -s -o /dev/null -w "%{http_code}" -c "$J" -b "$J" -H "Origin: $A" --data-urlencode "name=Smoke" --data-urlencode "email=$EMAIL" --data-urlencode "password=correct-horse-battery" "$A/register")
expect "$s" 303 "register"
start=$(date +%s%N)
s=$(curl -s -o "$W/out" -w "%{http_code}" -c "$J" -b "$J" -H "Origin: $A" -F "file=@$ZIP" "$A/api/imports")
expect "$s" 201 "import $(basename "$ZIP") in $(( ($(date +%s%N) - start) / 1000000 )) ms"
PID=$(json "$W/out" "d['project']['pid']")
s=$(call GET "/api/projects/$PID/editor"); expect "$s" 200 "editor state"
cp "$W/out" "$W/editor.json"
PO=$(json "$W/editor.json" "d['preview_origin']")
REV=$(json "$W/editor.json" "d['project']['revision']")
s=$(host_get "$PO/"); expect "$s" 200 "preview home page"
grep -q 'data-pagehaven="agent"' "$W/page" && echo "ok   preview has the editor agent"
grep -qi '^set-cookie' "$W/headers" && { echo "FAIL preview set a cookie"; exit 1; }
# The first main heading, or the first section heading when a page has no <h1>.
H1=$(python3 -I -c "import re,sys; h=open(sys.argv[1]).read(); m=re.search(r'<h1[^>]*data-ph-id=\"([0-9a-z]+)\"', h) or re.search(r'<h2[^>]*data-ph-id=\"([0-9a-z]+)\"', h); print(m.group(1))" "$W/page")
s=$(call POST "/api/projects/$PID/edits" "{\"base_revision\":$REV,\"page\":\"index.html\",\"edit\":{\"op\":\"set_text\",\"element\":\"$H1\",\"html\":\"Smoke test headline\"}}")
expect "$s" 200 "edit the headline"
REV=$(json "$W/out" "d['revision']")
s=$(call POST "/api/projects/$PID/edits" "{\"base_revision\":$((REV-1)),\"page\":\"index.html\",\"edit\":{\"op\":\"set_text\",\"element\":\"$H1\",\"html\":\"stale\"}}")
expect "$s" 409 "a stale tab is refused"
s=$(call POST "/api/projects/$PID/publish" "{\"base_revision\":$REV}"); expect "$s" 201 "publish release 1"
SITE=$(json "$W/out" "d['site_url']")
s=$(host_get "$SITE/"); expect "$s" 200 "live site home page"
grep -q "Smoke test headline" "$W/page" && echo "ok   live site shows the edit"
grep -q "data-ph-" "$W/page" && { echo "FAIL live site has editor markup"; exit 1; }
CSS=$(python3 -I -c "import re,sys; h=open(sys.argv[1]).read(); m=re.search(r'<link[^>]*rel=\"stylesheet\"[^>]*href=\"([^\"]+)\"|<link[^>]*href=\"([^\"]+\\.css)\"', h); print(m.group(1) or m.group(2))" "$W/page")
CSS=${CSS#/}
s=$(host_get "$SITE/$CSS"); expect "$s" 200 "live stylesheet $CSS"
grep -qi "content-type: text/css" "$W/headers" && echo "ok   stylesheet MIME type"
s=$(call POST "/api/projects/$PID/undo" "{\"base_revision\":$REV}"); expect "$s" 200 "undo"
REV=$(json "$W/out" "d['revision']")
s=$(call POST "/api/projects/$PID/publish" "{\"base_revision\":$REV}"); expect "$s" 201 "publish release 2"
s=$(host_get "$SITE/"); grep -q "Smoke test headline" "$W/page" && { echo "FAIL release 2 still has the edit"; exit 1; }; echo "ok   release 2 is live without the edit"
s=$(call POST "/api/projects/$PID/releases/1/activate" "{}"); expect "$s" 200 "roll back to release 1"
s=$(host_get "$SITE/"); grep -q "Smoke test headline" "$W/page" && echo "ok   release 1 is live again"
echo "all good ($W)"
