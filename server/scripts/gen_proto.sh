#!/usr/bin/env bash
set -euo pipefail

# proto 代码生成脚本
#
# 前置安装（一次性）：
#   go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
#   并确保 $GOPATH/bin 在 PATH 中（protoc 需要能找到 protoc-gen-go）
#
# 生成结果：server/proto/ 下的 *.pb.go，与 go_package（chenxiao/proto/xxx）对齐

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"       # server/
PROTO_DIR="$(cd "$SERVER_DIR/../proto" && pwd)"      # 共享 proto 目录

if ! command -v protoc >/dev/null 2>&1; then
  echo "错误：未找到 protoc，请先安装 protobuf 编译器" >&2
  exit 1
fi
if ! command -v protoc-gen-go >/dev/null 2>&1; then
  echo "错误：未找到 protoc-gen-go，请执行 go install google.golang.org/protobuf/cmd/protoc-gen-go@latest" >&2
  exit 1
fi

protoc \
  --proto_path="$PROTO_DIR" \
  --go_out="$SERVER_DIR" --go_opt=module=chenxiao \
  "$PROTO_DIR"/*.proto

echo "proto 代码已生成到 $SERVER_DIR/proto/"
