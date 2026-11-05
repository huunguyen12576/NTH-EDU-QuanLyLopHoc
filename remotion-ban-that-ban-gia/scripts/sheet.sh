#!/usr/bin/env bash
# Usage: scripts/sheet.sh <outDir> <cols> <frames...>  -> <outDir>/sheet.png
set -e
OUT="$1"; COLS="$2"; shift 2
mkdir -p "$OUT"; find "$OUT" -name 'f*.png' -delete
export REMOTION_CHROME=${REMOTION_CHROME:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
node scripts/stills.mjs "$OUT" 0.3 "$@" >/dev/null
N=$#; ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -v error -y -pattern_type glob -i "$OUT/f*.png" -vf "tile=${COLS}x${ROWS}:padding=4:color=0x333333" "$OUT/sheet.png"
