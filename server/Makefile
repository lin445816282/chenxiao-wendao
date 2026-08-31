.PHONY: proto excel2json tidy build run-gateway run-gameserver

# 生成 proto 代码（前置：已安装 protoc 与 protoc-gen-go）
proto:
	bash scripts/gen_proto.sh

# Excel -> JSON 导表（前置：cd tools/excel2json && npm install）
excel2json:
	node tools/excel2json/export.cjs

# 拉取/整理依赖（首次运行需执行）
tidy:
	go mod tidy

# 编译全部
build: proto
	go build ./...

# 启动网关（WebSocket 入口，V1 内嵌逻辑层）
run-gateway:
	go run ./cmd/gateway -config ./configs -addr :8080

# 启动逻辑服（V1 预留，后续拆分为独立进程）
run-gameserver:
	go run ./cmd/gameserver -config ./configs
