#!/usr/bin/env bash
# 网关守护进程：网关退出后自动重启（3 秒后）
# 用法：
#   bash supervise_gateway.sh        # 前台运行，Ctrl+C 停止
#   nohup bash supervise_gateway.sh &  # 后台运行
# 日志：server/gateway.log
set -u

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$SERVER_DIR/bin/gateway"
CONFIG="$SERVER_DIR/configs"
DB="$SERVER_DIR/data/game.db"
SMOKE="$(cd "$SERVER_DIR/../client/wx-minigame-smoke" && pwd)"
ADDR="${ADDR:-0.0.0.0:8080}"
LOG="$SERVER_DIR/gateway.log"

if [ ! -x "$BIN" ]; then
  echo "错误：找不到网关二进制 $BIN，请先执行 make build" >&2
  exit 1
fi
mkdir -p "$(dirname "$DB")"

echo "网关守护启动：$BIN -addr $ADDR（日志：$LOG）"
while true; do
  echo "[$(date '+%F %T')] 启动网关" >> "$LOG"
  "$BIN" -config "$CONFIG" -addr "$ADDR" -smoke "$SMOKE" -db "$DB" >> "$LOG" 2>&1
  code=$?
  echo "[$(date '+%F %T')] 网关退出（code=$code），3 秒后重启" >> "$LOG"
  sleep 3
done
