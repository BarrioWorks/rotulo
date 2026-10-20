#!/usr/bin/env bash
# The gate before every commit: formatting, Clippy, Rust tests, TypeScript types and frontend tests.
set -euo pipefail
cd "$(dirname "$0")/.."
cargo fmt --check
cargo clippy --all-targets -q -- -D warnings
cargo test -q 2>&1 | grep -E "^test result|FAILED|panicked" || true
cargo test -q > /dev/null 2>&1
npm run -s check
python3 -I scripts/design/check_icons.py
python3 -I scripts/design/check_static_refs.py
python3 -I scripts/design/contrast.py > /dev/null || { python3 -I scripts/design/contrast.py | grep FAIL; exit 1; }
npm test --silent > /dev/null && echo "frontend tests passed"
git diff --exit-code --stat -- assets/static/js || { echo "assets/static/js is out of date: run npm run build and commit"; exit 1; }
echo "check passed"
