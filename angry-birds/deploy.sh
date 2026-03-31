#!/bin/bash
# 愤怒的小鸟 - NAS部署脚本
# 在NAS上保存此文件并运行

PORT=8899
DIR="$(dirname "$0")"

echo "Starting Angry Birds game on port $PORT..."
cd "$DIR"
python3 -m http.server $PORT
