#!/usr/bin/env bash
# Usage: scripts/sheet.sh <outDir> <cols> <seconds...>  -> <outDir>/sheet.png
set -e
OUT="$1"; COLS="$2"; shift 2
mkdir -p "$OUT"; find "$OUT" -name 't*.png' -delete
export REMOTION_CHROME=${REMOTION_CHROME:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
node scripts/stills.mjs "$OUT" 0.35 "$@" >/dev/null
N=$#; ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -v error -y -pattern_type glob -i "$OUT/t*.png" -vf "tile=${COLS}x${ROWS}:padding=4:color=0x444444" "$OUT/sheet.png"
