#!/usr/bin/env sh

set -eu

PORT="${PORT:-4173}"

cd "$(dirname "$0")"

echo "Starting timetable app at http://localhost:${PORT}/src/index.html"
python3 -m http.server "$PORT"