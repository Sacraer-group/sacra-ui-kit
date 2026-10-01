#!/usr/bin/env sh
set -eu
clang --target=wasm32 -O3 -nostdlib -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined -o wasm/geometry.wasm src/geometry.c
python3 scripts/embed-wasm.py
