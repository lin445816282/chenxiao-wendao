# 《尘霄问道》Cocos 客户端骨架（M1）

对应 M1 原型验证：用 Cocos Creator 3.x 搭客户端，连真实服务器 `wss://game.ct256.cn/ws`。

> 本目录提供**脚本代码**，场景/节点/预制体需在 Cocos Creator 编辑器里搭建（编辑器会自动生成 `.meta`、场景文件，无法离线手写）。

## 1. 目录说明

```
client/cocos/assets/scripts/
├── sdk/               # 网络 SDK（复用 client-sdk，codec 改为内嵌 proto 源）
│   ├── proto_sources.js  # 内嵌全部 .proto 源（自动生成）
│   ├── codec.ts          # 编解码（protobufjs.parse，无文件系统依赖）
│   ├── client.ts         # GameClient
│   ├── api.ts            # GameApi（登录/挂机/战斗/装备/灵宠/排行）
│   └── msgid.ts
├── core/
│   └── NetManager.ts     # 单例：连接 + 持有 GameApi
├── ui/
│   ├── LoginPanel.ts     # 登录/建号
│   ├── HomePanel.ts      # 离线挂机收益
│   ├── BattlePanel.ts    # 秘境战斗
│   ├── EquipPanel.ts     # 装备列表/强化
│   ├── PetPanel.ts       # 灵宠列表
│   └── RankPanel.ts      # 排行榜
└── game/
    └── BattleReplay.ts   # 战斗回放（回合序列播放）
```

## 2. 在 Cocos Creator 里搭建

1. **新建项目**：Cocos Creator 3.x → 新建空项目（2D）。
2. **导入脚本**：把 `assets/scripts/` 整个目录拷进项目的 `assets/` 下，编辑器会自动生成 `.meta`。
3. **安装 protobufjs**：Cocos 项目里需要 `protobufjs` 依赖。方式：
   - 在项目根执行 `npm install protobufjs`，然后在脚本里 `import protobuf from 'protobufjs'`；
   - 或用 Cocos 的「扩展/插件」引入（Cocos 3.8+ 支持 npm 依赖）。
4. **建场景**（以一个场景为例，所有面板可拆成多个场景或预制体）：
   - Canvas 下建一个空节点，挂 `NetManager.ts`（常驻，启动时调用 `connect`）。
   - 建 UI 节点：登录面板（挂 `LoginPanel`，含一个 `Label` 绑 `statusLabel`、一个 `EditBox` 绑 `nameInput`、两个按钮分别绑 `onLogin`/`onCreateRole`）。
   - 其余面板同理：`HomePanel`/`BattlePanel`/`EquipPanel`/`PetPanel`/`RankPanel`，每个把 `Label` 拖到对应的 `@property` 上。

## 3. 连接服务器

在 `NetManager` 节点上挂一个启动脚本（或直接在 `LoginPanel.start()` 里）调用：

```ts
await NetManager.instance!.connect('wss://game.ct256.cn/ws');  // 外网
// 本地调试：ws://127.0.0.1:8080/ws
```

## 4. 按钮绑定

每个 Panel 的方法（`onLogin`、`onCreateRole`、`onClaimOffline`、`onStartBattle`、`onRefresh`、`onStrengthenFirst`）都是 `async`，在 Cocos 按钮组件里选对应脚本 + 方法名即可。

## 5. 注意事项

- **微信小游戏域名**：真机需 `game.ct256.cn` 加入微信「socket 合法域名」（已备案），开发工具勾「不校验合法域名」。
- **proto 内嵌**：`proto_sources.js` 是自动生成的（在 `client-sdk` 里跑 `node` 生成脚本）；改了 `.proto` 后需重新生成。
- **int64**：解码用 `longs: Number`，数值超 2^53 需改 `longs: String` 并自行转 BigInt。
- 本骨架只做「逻辑 + 数据」，**美术/动画**（立绘、飘字、特效）需在编辑器里加，`BattleReplay` 已把回合序列拆好，动画层逐回合读 `nextRound()` 即可。
