#!/usr/bin/env bash
# transcode-hls.sh — genera un ladder HLS VOD (1080p/720p/480p) desde un master MP4.
#
# Uso:   ./transcode-hls.sh <master.mp4> <slug> [output_root]
# Ej:    ./transcode-hls.sh "Manu Martinez.mp4" manu-martinez /var/www/hls
#
# Salida: <output_root>/<slug>/
#   ├── master.m3u8          # playlist maestra (ABR)
#   ├── 1080p/index.m3u8 + segmentos .ts
#   ├── 720p/index.m3u8  + segmentos .ts
#   ├── 480p/index.m3u8  + segmentos .ts
#   └── poster.jpg
# Imprime al final el hlsUrl y durationSec para cargar vía PATCH /api/catalog/admin/sessions/:id/hls
set -euo pipefail

MASTER="${1:?Uso: $0 <master.mp4> <slug> [output_root]}"
SLUG="${2:?Falta el slug}"
OUT_ROOT="${3:-/var/www/hls}"
OUT="$OUT_ROOT/$SLUG"
BASE_URL="${HLS_BASE_URL:-https://media.enrec.com.ar/hls}"

command -v ffmpeg >/dev/null || { echo "ffmpeg no está instalado" >&2; exit 1; }

mkdir -p "$OUT"/{1080p,720p,480p}

# height:bitrate_video:bitrate_audio:bufsize
LADDER=(
  "1080:5000k:128k:7500k"
  "720:2800k:128k:4200k"
  "480:1200k:96k:1800k"
)

for rung in "${LADDER[@]}"; do
  IFS=: read -r H VB AB BUF <<<"$rung"
  echo ">>> Transcodeando ${H}p..."
  ffmpeg -hide_banner -loglevel warning -y -i "$MASTER" \
    -vf "scale=-2:${H}" \
    -c:v libx264 -profile:v high -preset medium -crf 21 \
    -maxrate "$VB" -bufsize "$BUF" \
    -g 48 -keyint_min 48 -sc_threshold 0 \
    -c:a aac -b:a "$AB" -ac 2 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUT/${H}p/seg_%04d.ts" \
    "$OUT/${H}p/index.m3u8"
done

cat > "$OUT/master.m3u8" <<EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5500000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3100000,RESOLUTION=1280x720,CODECS="avc1.640020,mp4a.40.2"
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480,CODECS="avc1.64001f,mp4a.40.2"
480p/index.m3u8
EOF

echo ">>> Extrayendo poster..."
ffmpeg -hide_banner -loglevel warning -y -ss 00:00:05 -i "$MASTER" -frames:v 1 -update 1 -q:v 3 "$OUT/poster.jpg"

DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$MASTER" | cut -d. -f1)

echo ""
echo "=== LISTO: $SLUG ==="
echo "hlsUrl:      $BASE_URL/$SLUG/master.m3u8"
echo "posterUrl:   $BASE_URL/$SLUG/poster.jpg"
echo "durationSec: $DURATION"
