#!/usr/bin/env bash
# ingest-batch.sh — baja, transcodea y publica al NAS las sesiones que falten.
#
# Procesa de a una para no llenar el disco local: descarga → transcodea →
# copia al NAS → borra la copia local. Saltea las que ya existan en el NAS.
#
# Uso: ./ingest-batch.sh            (usa la lista de abajo)
set -uo pipefail

WORK="${WORK:-/Users/meckhardt/Documents/Desarrollos/enrec-media}"
NAS="${NAS:-$HOME/mnt-rectv/enrec-media}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# slug|youtubeVideoId
SESSIONS=(
  "fepo|zNRcYUV6ZdE"
  "coval|3CRVIZJU8F8"
  "francisca-y-los-exploradores|4GrL1ccJ3mo"
  "luaso|yEq3rOBf0SM"
  "martu-brito|BZivQ-XM7tI"
  "motel-montpellier|nTQM4gD68Yo"
  "jjjulian|jngaRABfN50"
  "mina-baxx|kLsmlObEMUk"
  "los-palmos|qXqajLd4YHI"
)

mkdir -p "$WORK/masters" "$WORK/hls"
ok=0; fail=0

for entry in "${SESSIONS[@]}"; do
  IFS='|' read -r SLUG VID <<<"$entry"

  if [[ -f "$NAS/hls/$SLUG/master.m3u8" ]]; then
    echo "==> $SLUG ya está en el NAS, salteando"
    continue
  fi

  echo ""
  echo "############ $SLUG ($VID) ############"
  MASTER="$WORK/masters/$SLUG.mp4"

  if [[ ! -f "$MASTER" ]]; then
    yt-dlp -q --no-warnings -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 \
      -o "$MASTER" "https://youtu.be/$VID" || { echo "!! falló la descarga de $SLUG"; ((fail++)); continue; }
  fi

  HLS_BASE_URL="http://192.168.0.4/shares/rectv/enrec-media/hls" \
    "$SCRIPT_DIR/transcode-hls.sh" "$MASTER" "$SLUG" "$WORK/hls" \
    || { echo "!! falló el transcodeo de $SLUG"; ((fail++)); continue; }

  # publicar al NAS y liberar disco local
  rsync -a "$WORK/hls/$SLUG" "$NAS/hls/" && rsync -a "$MASTER" "$NAS/masters/" \
    || { echo "!! falló la copia al NAS de $SLUG"; ((fail++)); continue; }
  rm -rf "$WORK/hls/$SLUG" "$MASTER"

  echo ">>> $SLUG publicado en el NAS"
  ((ok++))
done

echo ""
echo "======== LISTO: $ok publicadas, $fail con error ========"
ls "$NAS/hls"
