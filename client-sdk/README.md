# 《尘霄问道》客户端 SDK（TypeScript）

用 protobufjs 解析真实 `.proto`，封装 WebSocket 协议帧与各业务模块 API。**同一套代码可直接进 Cocos Creator 客户端**，也能在 Node 环境跑（已验证）。

## 目录

```
client-sdk/
├── proto/          # 从 server/proto/ 拷贝的 .proto 文件
├── src/
│   ├── codec.ts    # 协议帧编解码 + protobuf 加载
│   ├── client.ts   # GameClient：连接 + 顺序请求/响应
│   ├── api.ts      # GameApi：登录/挂机/战斗/装备/灵宠/排行榜
│   ├── msgid.ts    # 消息 ID 常量
│   └── index.ts    # 导出
├── test/smoke.ts   # 冒烟测试（连真实服务器）
└── dist/           # tsc 编译产物
```

## 使用

```bash
cd client-sdk
npm install          # 安装 protobufjs
npx tsc              # 编译到 dist/
node dist/test/smoke.js          # 冒烟测试（默认连 ws://127.0.0.1:8080/ws）
SERVER_URL=wss://game.ct256.cn/ws node dist/test/smoke.js   # 连外网
```

```ts
import { loadProto } from './src/codec';
import { GameClient } from './src/client';
import { GameApi } from './src/api';

await loadProto(['proto/common.proto', 'proto/login.proto', /* ... */]);
const client = new GameClient();
await client.connect('wss://game.ct256.cn/ws');
const api = new GameApi(client);

const login = await api.login();
const battle = await api.startStage(1001);
const rank = await api.rankQuery();
```

## 协议帧格式（与服务端对齐）

```
[msgId uint32 大端][bodyLen uint32 大端][protobuf body]
```

## 已接入的 API

| 方法 | 消息 |
|------|------|
| `login(code)` | C2SLogin → S2CLogin |
| `createRole(nickname)` | C2SCreateRole → S2CCreateRole |
| `offlineRewardQuery()` / `offlineRewardClaim()` | 挂机收益 |
| `startStage(stageId)` | 战斗（含回合/掉落） |
| `equipList()` / `equipStrengthen(uid)` | 装备 |
| `petList()` | 灵宠 |
| `rankQuery()` | 排行榜 |

## 说明

- 本 SDK 用 `protobufjs` 加载 `.proto`（`loadProto`），消息名用完整包名（如 `chenxiao.login.C2SLogin`）。
- int64 解码为 JS `number`（`longs: Number`），对本项目数值量级够用；若未来数值超过 2^53 需改 `longs: String`。
- 接入 Cocos 时：把 `src/` 拷进 `assets/scripts/`，`loadProto` 改为用 Cocos 的资源加载器读 `.proto` 文本（或预编译成静态 JS 模块）。
