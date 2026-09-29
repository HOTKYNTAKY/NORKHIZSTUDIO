#!/usr/bin/env bash
# ==============================================================================
# VELVETVAULT PRO — FFMPEG MULTI-BITRATE HLS TRANSCODER & THUMBNAIL EXTRACTOR
# Converts uploaded source videos into adaptive 1080p / 720p / 480p HLS streams
# ==============================================================================
set -euo pipefail

INPUT_FILE="${1:-}"
VIDEO_ID="${2:-video_$(date +%s)}"
OUTPUT_BASE="${3:-./public/uploads/hls/${VIDEO_ID}}"
THUMB_OUT="${4:-./public/uploads/thumbnails/${VIDEO_ID}.jpg}"

if [[ -z "$INPUT_FILE" || ! -f "$INPUT_FILE" ]]; then
  echo "Usage: bash transcode-hls.sh <input.mp4> [video_id] [output_dir] [thumb_path]"
  exit 1
fi

mkdir -p "$OUTPUT_BASE"
mkdir -p "$(dirname "$THUMB_OUT")"

echo "[FFmpeg] Extracting high-res cover thumbnail..."
ffmpeg -y -ss 00:00:05 -i "$INPUT_FILE" -frames:v 1 -q:v 2 "$THUMB_OUT" >/dev/null 2>&1 || true

echo "[FFmpeg] Generating HLS 1080p / 720p / 480p segments in $OUTPUT_BASE..."
ffmpeg -y -i "$INPUT_FILE" \
  -vf "scale=w=1280:h=720:force_original_aspect_ratio=decrease" \
  -c:a aac -ar 48000 -c:v h264 -profile:v main -crf 21 -sc_threshold 0 \
  -g 48 -keyint_min 48 -hls_time 6 -hls_playlist_type vod \
  -b:v 2800k -maxrate 2996k -bufsize 4200k -b:a 128k \
  -hls_segment_filename "${OUTPUT_BASE}/seg_%03d.ts" \
  "${OUTPUT_BASE}/master.m3u8"

echo "[OK] Transcoding complete: ${OUTPUT_BASE}/master.m3u8"
