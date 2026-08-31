# 《尘霄问道》Go 后端工程骨架

对应 M2 里程碑：网关 + 逻辑服 + Protobuf 协议 + 配置表加载。V1.0 单体部署（网关与逻辑层同进程），跨服/独立进程拆分留待后续迭代。

## 1. 目录结构

```
server/
├── go.mod                       # module chenxiao
├── Makefile                     # proto / tidy / build / run
├── scripts/gen_proto.sh         # protoc 生成 pb.go
├── cmd/
│   ├── gateway/main.go          # 网关：WebSocket 接入 + 鉴权 + 路由
│   └── gameserver/main.go       # 逻辑服：配置/存储/业务（V1 预留独立入口）
├── internal/
│   ├── msgid/                   # 消息 ID 常量（对齐 proto/common.proto MsgId）
│   ├── net/                     # 编解码、连接、WebSocket 服务
│   ├── handler/                 # 消息路由分发 + 注册
│   ├── config/                  # 配置结构 + JSON 加载器
│   ├── store/                   # MySQL / Redis 封装
│   ├── app/                     # 组装配置/存储/分发
│   └── game/                    # 业务 handler（login 为完整示例，其余 stub）
├── configs/                     # 导表产物示例（stage/equip/pet/drop/hang）
└── proto/                       # （生成后出现）*.pb.go
```

## 2. 前置

- Go 1.22+
- protoc（protobuf 编译器）
- protoc-gen-go：`go install google.golang.org/protobuf/cmd/protoc-gen-go@latest`，确保 `$GOPATH/bin` 在 PATH

## 3. 首次构建

```bash
cd chenxiao-wendao/server
make proto    # 从 ../proto/*.proto 生成 pb.go 到 server/proto/
make tidy     # 拉取依赖
make build    # 编译全部（proto + go build ./...）
```

> 已实测通过（Go 1.22.5 + protoc 25.3 + protoc-gen-go v1.36.x，`go build ./...` 零错误）。
> **国内网络**若 `go mod tidy` 卡在 proxy.golang.org，先设置代理：
> `export GOPROXY=https://goproxy.cn,direct`

## 4. 冒烟测试

编译并启动网关后，用一个最小 WebSocket 客户端验证「连接 → 发 C2SLogin → 收 S2CLogin」：

```bash
go build -o /tmp/gateway ./cmd/gateway
/tmp/gateway -config ./configs -addr :8080 &
node tools/smoke_client.cjs ws://127.0.0.1:8080/ws
```

预期输出「✅ 冒烟测试通过」，证明编解码、路由、handler、配置加载全链路正常。

## 5. 运行

```bash
make run-gateway      # 网关，监听 :8080，WebSocket 路径 /ws
make run-gameserver   # 逻辑服（V1 仅加载配置并等待退出信号）
```

## 6. 协议帧格式

每个 WebSocket 二进制消息一帧：

```
+----------------+----------------+------------------+
| msgId (uint32) | bodyLen(uint32)| body (protobuf)  |
+----------------+----------------+------------------+
```

大端序。`msgId` 见 `proto/common.proto` 的 `MsgId` 枚举（`internal/msgid` 有同值常量）。

## 7. 关键约定（与已有设计对齐）

- **服务端权威**：战斗/挂机/掉落/养成消耗全在 `internal/game` 结算，客户端只回放。
- **配置表**：Excel（`excel/*.xlsx`）→ `make excel2json`（`tools/excel2json/`）→ `configs/*.json` → `internal/config` 加载并建索引。
- **离线结算**：依据 `configs/hang.json` 的 `max_offline_seconds` 封顶，产出系数与最高通关关卡挂钩（M3 实现）。
- **存储**：MySQL 持久化（表结构见 `docs/01-database-design.md`），Redis 热缓存/会话/排行榜。
- **广告防刷**：`biz_id` 幂等 + 服务端向微信校验（`internal/game/ad.go`）。

## 8. 下一步（进入 M2/M3 落地）

- [x] Excel → JSON 导表工具（`tools/excel2json/`，`make excel2json`）
- [ ] 微信 `code2session` 鉴权接入（`internal/game/login.go`）
- [ ] MySQL DSN / Redis 配置化 + 启动时初始化（`internal/app/app.go`）
- [ ] 各业务模块从 stub 补成真实实现（装备强化/灵宠/背包/邮件/排行/广告）
- [ ] 战斗结算引擎 + 离线挂机定时结算（`internal/game/dungeon.go` / `offline.go`）
