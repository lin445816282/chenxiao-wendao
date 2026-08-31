# 《尘霄问道》微信仙侠挂机小游戏

技术对标：Cocos Creator(TS) + Go 后端 + Protobuf + MySQL/Redis，服务端权威计算。
定位：原创魔改仙侠挂机 ARPG，广告变现（无充值），目标平台微信小游戏。

> 本仓库是**完整的技术落地工程**：后端已可运行并通过验证，客户端 SDK/骨架就绪，合规文档备齐。

## 一、目录结构

```
chenxiao-wendao/
├── docs/                    # 设计 + 合规文档
│   ├── 01-database-design.md        # MySQL 表结构设计
│   ├── 02-cocos-directory-spec.md   # Cocos 目录规范
│   ├── 03-privacy-policy.md         # 隐私协议模板
│   ├── 04-probability-disclosure.md # 概率公示（含真实掉落概率）
│   └── 05-self-review-report.md     # 自审自查报告模板
├── proto/                   # 10 个 .proto 协议（common + 9 业务模块）
├── server/                  # Go 后端（✅ 编译运行 + 验证）
│   ├── cmd/gateway, cmd/gameserver
│   ├── internal/{msgid,net,handler,config,store,app,game}
│   ├── configs/             # 导表产物 JSON
│   ├── excel/               # 导表源 Excel
│   ├── tools/               # 导表工具 + 验证脚本
│   ├── deploy/              # nginx/ systemd/ 部署文档
│   └── data/game.db         # SQLite（开发持久化）
├── client-sdk/              # TS 客户端 SDK（protobufjs，✅ 验证）
├── client/cocos/            # Cocos 客户端骨架（M1）
├── client/wx-minigame-smoke/# 微信小游戏连通性测试
└── tools/gen_assets/        # 豆包素材生成（20 项已生成）
```

## 二、已实现并验证的核心功能

| 模块 | 状态 | 说明 |
|------|------|------|
| 登录/建号 | ✅ | openid 占位(mock 账号)，角色落库 |
| 挂机修炼 | ✅ | 服务端结算，离线收益落库 |
| 秘境闯关 | ✅ | 服务端战斗，回合序列回放 |
| 掉落 | ✅ | 权重随机，装备/灵宠落库 |
| 装备 | ✅ | 掉落/列表/强化（扣铜钱+等级） |
| 灵宠 | ✅ | 掉落/列表 |
| 排行榜 | ✅ | Redis ZSet 战力榜 |
| 持久化 | ✅ | SQLite（生产换 MySQL，改 DSN 即可） |
| 客户端 SDK | ✅ | TypeScript + protobufjs，连真实服务器验证通过 |
| Cocos 骨架 | ✅ | codec 已验证，UI 待编辑器搭建 |

**服务端权威**：战斗/挂机/掉落/养成全部由 Go 服务端结算，客户端只回放表现，杜绝本地篡改。

## 三、如何运行

### 后端（Go）

```bash
cd server
make proto && make tidy && make build    # 编译
make run-gateway                         # 启动网关（:8080，/ws + /healthz）
# 国内网络先 export GOPROXY=https://goproxy.cn,direct
```

### 客户端 SDK 验证（Node）

```bash
cd client-sdk
npm install && npx tsc
node dist/test/smoke.js                  # 连 ws://127.0.0.1:8080/ws
SERVER_URL=wss://game.ct256.cn/ws node dist/test/smoke.js  # 连外网
```

### 浏览器测试面板

打开 `https://game.ct256.cn/smoke/`（或本地 `http://127.0.0.1:8080/smoke/`）。

### Cocos 客户端

按 `client/cocos/README.md` 在 Cocos Creator 里建项目、导入 `assets/scripts/`、搭场景。

## 四、导表（Excel → JSON）

```bash
cd server
make excel2json   # 读 excel/*.xlsx 生成 configs/*.json
```

## 五、外网部署

见 `server/deploy/DEPLOY.md`：云服务器 → 备案域名 → nginx WSS 反代 → 微信 socket 域名白名单。

## 六、下一步（剩余工作）

- [ ] Cocos 客户端 UI/美术（在编辑器里搭，接已生成素材）
- [ ] 微信 `code2session` 真实登录（需 AppID/Secret）
- [ ] SQLite → MySQL（换 DSN + DDL，代码不变）
- [ ] 剩余业务：装备精炼/词条/套装、灵宠出战/进化、背包/邮件、广告
- [ ] 合规材料落地：软著、ICP 备案、防沉迷接入
- [ ] 版号（拿版号后再做付费商城/跨服）

## 七、关键提醒

1. **广告版无充值**：V1.0 不得出现任何充值/付费/元宝购买入口，否则审核直接驳回（自审清单已标注）。
2. **备案域名**：微信小游戏要求 socket 合法域名已备案；`ct256.cn` 走 Cloudflare，需确认备案情况。
3. **素材版权**：AI 生成素材上线前确认火山方舟商用授权；世界观/命名原创、不抄袭现有 IP。
