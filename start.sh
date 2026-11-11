#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ ! -d node_modules ]]; then npm ci; fi
npm run build
exec cargo run --locked --bin archimede
