#!/bin/sh
# comma2k19 청크를 data/raw/comma2k19/에 받는다. 끊기면 같은 명령으로 이어받는다.
# 청크 1~2: Toyota RAV4, 청크 3~10: Honda Civic. 청크당 약 9GB.
# 사용: scripts/download_comma2k19.sh [청크 번호, 기본 3] [--unzip]
set -e
n=${1:-3}
root=$(cd "$(dirname "$0")/.." && pwd)
dest="$root/data/raw/comma2k19"
mkdir -p "$dest"
url="https://huggingface.co/datasets/commaai/comma2k19/resolve/main/raw_data/Chunk_${n}.zip"
curl -L -C - --retry 5 --retry-delay 5 -o "$dest/Chunk_${n}.zip" "$url"
if [ "$2" = "--unzip" ]; then
  unzip -q -n "$dest/Chunk_${n}.zip" -d "$dest"
fi
echo "완료: $dest/Chunk_${n}.zip"
