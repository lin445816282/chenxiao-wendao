# 《尘霄问道》Cocos Creator 项目目录结构规范

> 版本：v0.1（原型阶段）
> 目标里程碑：M1 原型验证 / M4 微信小游戏专项优化
> 引擎：Cocos Creator 3.x，TypeScript
> 配套：项目整体计划、MySQL 表结构设计、proto 协议

---

## 1. 核心原则

1. **表现与逻辑分离**：战斗/数值/掉落全部由服务端计算，客户端只做「表现层」。所有客户端数值一律来自服务端下发，本地不存权威数据。
2. **分包加载**：主包 ≤ 4M，战斗、特效、时装等重资源进分包懒加载。
3. **对象池复用**：怪物、特效、飘字、子弹全部走对象池，杜绝高频 `instantiate/destroy` 造成 GC 峰值与内存闪退。
4. **UI 与业务解耦**：UI 只负责展示与事件转发，业务逻辑放 Manager/Service 层，便于 Mock（M1 阶段）与真实后端（M2 后）切换。
5. **统一资源命名**：小写蛇形命名，前缀标识类型，便于分包、查找与导表映射。

---

## 2. 目录树

```
assets/
├── scenes/                        # 场景（分包入口场景放根，重场景进分包）
│   ├── main.scene                 # 启动场景（主包，仅含启动/更新/登录）
│   ├── home.scene                 # 主界面（主包：挂机/秘境/装备/灵宠导航）
│   └── battle/
│       └── battle.scene           # 战斗场景（battle 分包）
│
├── scripts/                       # TypeScript 脚本（业务逻辑）
│   ├── core/                      # 框架层（不依赖具体业务）
│   │   ├── net/                   # 网络层
│   │   │   ├── SocketClient.ts    # WebSocket 连接管理
│   │   │   ├── MsgDispatcher.ts   # MsgId -> handler 路由
│   │   │   └── Codec.ts           # Protobuf 编解码
│   │   ├── proto/                 # 生成的 protobuf JS 代码（由 proto 文件生成）
│   │   ├── ui/                    # UI 基础框架
│   │   │   ├── UIManager.ts       # 界面栈、弹窗管理
│   │   │   ├── BaseUI.ts          # 界面基类
│   │   │   └── Toast.ts           # 通用飘字/提示
│   │   ├── pool/                  # 对象池
│   │   │   ├── NodePool.ts        # 通用节点池
│   │   │   └── PoolManager.ts     # 池管理器
│   │   ├── res/                   # 资源加载（bundle 加载、缓存）
│   │   ├── event/                 # 事件总线
│   │   ├── time/                  # 定时器/离线时间对齐
│   │   └── utils/                 # 工具函数
│   │
│   ├── managers/                  # 全局管理器（单例，业务级）
│   │   ├── LoginManager.ts        # 登录/会话
│   │   ├── PlayerManager.ts       # 角色数据缓存（服务端快照）
│   │   ├── BattleManager.ts       # 战斗流程编排（播表现）
│   │   ├── EquipManager.ts        # 装备养成
│   │   ├── PetManager.ts          # 灵宠
│   │   ├── BagManager.ts          # 背包
│   │   ├── MailManager.ts         # 邮件
│   │   ├── RankManager.ts         # 排行榜
│   │   ├── AdManager.ts           # 广告（微信 SDK 封装）
│   │   └── OfflineManager.ts      # 挂机/离线收益
│   │
│   ├── services/                  # 协议服务层（每个模块封装 C2S/S2C）
│   │   ├── LoginService.ts
│   │   ├── OfflineService.ts
│   │   ├── DungeonService.ts
│   │   ├── EquipService.ts
│   │   ├── PetService.ts
│   │   ├── BagService.ts
│   │   ├── MailService.ts
│   │   ├── RankService.ts
│   │   └── AdService.ts
│   │
│   ├── mock/                      # Mock 数据（M1 阶段，可整体移除）
│   │   ├── MockServer.ts          # 模拟协议返回
│   │   └── mock_data/             # 假战斗/掉落数据
│   │
│   └── game/                      # 具体玩法表现层
│       ├── battle/                # 战斗表现
│       │   ├── BattleView.ts      # 战斗表现驱动（读回合序列播动画）
│       │   ├── Hero.ts            # 角色单位
│       │   ├── Monster.ts         # 怪物单位
│       │   ├── Pet.ts             # 灵宠单位
│       │   └── DamageFloat.ts     # 飘字
│       └── home/                  # 主界面各页签
│           ├── HangPage.ts        # 挂机页
│           ├── DungeonPage.ts     # 秘境页
│           ├── EquipPage.ts       # 装备页
│           ├── PetPage.ts         # 灵宠页
│           ├── BagPage.ts         # 背包页
│           └── MailPage.ts        # 邮件页
│
├── prefabs/                       # 预制体（按模块/分包组织）
│   ├── common/                    # 通用（Toast、弹窗、按钮、Loading）
│   ├── ui/                        # 界面预制体
│   ├── battle/                    # 战斗相关（怪物、技能特效、飘字）
│   └── ...
│
├── textures/                      # 静态贴图（主包）
│   ├── ui/
│   ├── icon/                      # 图标（装备/灵宠/材料，图集化）
│   └── ...
│
├── anim/                          # 动画/骨骼
├── effects/                       # 特效（进分包，走对象池）
├── audio/                         # 音频
├── fonts/                         # 字体
└── config/                        # 客户端配置（导表生成）
    ├── stage.json                 # 关卡配置
    ├── equip.json                 # 装备配置
    ├── pet.json                   # 灵宠配置
    └── ...
```

---

## 3. 分包策略

| 分包 | 内容 | 目标大小 |
|------|------|----------|
| 主包 `main` | 启动场景、登录、主界面、核心框架、公共 UI、配置 | ≤ 4M |
| `battle` | 战斗场景、怪物、技能特效、战斗表现 | 按需加载 |
| `res-common` | 装备/灵宠图标、通用特效、时装 | 按需加载 |

- 用 Cocos 的 **Asset Bundle** 机制切分包；主包只保留 `main` bundle 必需的资源。
- 战斗/特效资源进分包后，进入对应玩法前 `bundle.load` 预加载，避免运行时卡顿。
- 所有 UI 图集统一打图集（SpriteAtlas），减少 draw call 与包体。

---

## 4. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 脚本类 | 大驼峰 `PascalCase` | `LoginManager.ts` |
| 场景 | 小写蛇形 `.scene` | `battle.scene` |
| 预制体 | 前缀 `p_` + 小写蛇形 | `p_monster_slime.prefab` |
| 贴图 | 前缀 `tex_` | `tex_icon_sword.png` |
| 特效 | 前缀 `fx_` | `fx_skill_fire.prefab` |
| 音频 | 前缀 `snd_` / `bgm_` | `snd_click.mp3`、`bgm_home.mp3` |
| 配置 json | 小写蛇形 | `stage.json` |
| 节点 | 小驼峰/语义化 | `btnBattle`、`nodeDamageText` |

---

## 5. 表现与战斗计算分离（重点）

战斗全流程服务端权威，客户端「只回放」：

```
服务端算出整场战斗 -> S2CStartStage(rounds[]) -> 客户端 BattleView 逐回合播动画/飘字
```

- `BattleView` 是「回放播放器」：读 `BattleRound.actions`，按顺序触发单位动作、伤害飘字、暴击/闪避表现。
- 客户端**不判断胜负、不算伤害、不判掉落**，只展示 `win` / `rewards` / `equips` 等结果字段。
- 扫荡（`S2CSweepStage`）无回合序列，直接弹结算面板，进一步省性能。
- 挂机收益同理：客户端只显示 `S2COfflineRewardQuery/Claim` 的预览与到账结果。

---

## 6. 对象池规范

- 复用对象：怪物节点、技能特效、伤害/治疗飘字、物品掉落图标、通用弹窗。
- `PoolManager` 统一管理，按 key（prefab 路径）取池；`NodePool` 封装 `get/put`。
- 飘字高频出现，必须走池；池容量设上限，超出即回收，避免无限增长。
- 战斗场景切换时统一 `PoolManager.clear()`，防止跨场景引用泄漏。

---

## 7. 网络层规范

- `SocketClient` 负责 WebSocket 连接、心跳（`C2SHeartbeat`）、断线重连（指数退避）。
- `MsgDispatcher` 按 `MsgId` 注册 handler，`Service` 层封装「发请求 -> 等响应」的 Promise 化接口。
- 每个 S2C 首字段为 `common.Result`，统一错误处理与 `Toast` 提示。
- 断线重连后：重新登录续 token、拉取角色快照、补拉挂机收益预览。

---

## 8. Mock 层（M1 原型验证专用）

- M1 阶段不连真实 Go 服务，`MockServer` 拦截 `Service` 层，返回 `mock_data` 中的假战斗/掉落/挂机数据。
- `Service` 层定义统一接口，M2 后切换为真实协议实现，**业务 UI 与 Manager 代码零改动**。

---

## 9. 下一步待补

- [ ] 导表工具（Excel -> json）脚本，配置表字段与客户端读取约定
- [ ] 微信 SDK 封装（登录/广告/防沉迷）具体接口定义
- [ ] 战斗回放（`BattleView`）动画状态机与技能表现细节
