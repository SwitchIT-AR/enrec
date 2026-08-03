#!/usr/bin/env bash
# ingest.sh — pipeline completo por sesión: baja el master del canal propio,
# transcodea a HLS y deja el master guardado para re-transcodear a futuro.
#
# Uso: ./ingest.sh <youtubeVideoId> <slug>
# Ej:  ./ingest.sh dQw4w9WgXcQ manu-martinez
#
# Vars opcionales: MASTERS_DIR (default /srv/enrec-masters), HLS_ROOT (default /var/www/hls)
set -euo pipefail

VIDEO_ID="${1:?Uso: $0 <youtubeVideoId> <slug>}"
SLUG="${2:?Falta el slug}"
MASTERS_DIR="${MASTERS_DIR:-/srv/enrec-masters}"
HLS_ROOT="${HLS_ROOT:-/var/www/hls}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v yt-dlp >/dev/null || { echo "yt-dlp no está instalado" >&2; exit 1; }

mkdir -p "$MASTERS_DIR"
MASTER="$MASTERS_DIR/$SLUG.mp4"

if [[ -f "$MASTER" ]]; then
  echo ">>> Master ya existe: $MASTER (salteando descarga)"
else
  echo ">>> Bajando master de YouTube ($VIDEO_ID)..."
  yt-dlp -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 \
    -o "$MASTER" "https://youtu.be/$VIDEO_ID"
fi

"$SCRIPT_DIR/transcode-hls.sh" "$MASTER" "$SLUG" "$HLS_ROOT"
