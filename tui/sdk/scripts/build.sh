#!/bin/sh
# Build locally. No registry, server, Docker, browser or Go module download needed.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$ROOT/bin"
cd "$ROOT/go"
GOWORK=off CGO_ENABLED=0 go build -trimpath -o "$ROOT/bin/sacra-tui" ./cmd/sacra-tui
printf '\nBuilt: %s/bin/sacra-tui\n' "$ROOT"
