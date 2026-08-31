# Cocos 客户端搭建规格书（M1 · 跟做清单）

> 目标：在 Cocos Creator 里搭出一个能连真实服务器、跑通「登录 → 挂机领取 → 秘境战斗 → 装备」的可玩 Demo。
> 脚本已备好（`assets/scripts/`），本清单只讲**编辑器里的操作**，照着点即可。

## 前置

- Cocos Creator 3.x（3.8 推荐）
- 服务器已运行：`wss://game.ct256.cn/ws`（外网）或 `ws://127.0.0.1:8080/ws`（本地）

---

## 第一步：建项目 + 导入脚本

1. 新建**空项目（2D）**，项目名 `chenxiao-wendao`。
2. 把本目录 `assets/scripts/` 整个拷进项目的 `assets/` 下（编辑器自动生成 `.meta`）。
3. 安装依赖：项目根 `npm install protobufjs`（Cocos 3.8 支持 npm 依赖）。

## 第二步：导入美术素材

把 `tools/gen_assets/output/images/` 里的图拖进 `assets/textures/`（或建 `assets/art/`）：
- `hero_male.jpg`（主角）、`scene_hang.jpg`（挂机背景）、`scene_dungeon.jpg`（战斗背景）、`login_bg.jpg`（登录背景）、`icon_weapon.jpg`、`icon_armor.jpg`（图标）、`pet_linghu.jpg`、`monster_basic.jpg` 等。

## 第三步：搭主场景

### 3.1 常驻节点
- 场景 `Canvas` 下建空节点，命名 **`NetManager`**，挂 `core/NetManager.ts`。
- 再建空节点 **`Boot`**，挂一个新脚本（下面第 5 步给代码），用于启动时连接。

### 3.2 登录面板
建节点 `Canvas/LoginPanel`，子节点：
| 节点 | 类型 | 说明 |
|------|------|------|
| `Status` | Label | 状态文字，绑 `LoginPanel.statusLabel` |
| `NameInput` | EditBox | 昵称输入，绑 `LoginPanel.nameInput` |
| `BtnLogin` | Button | 文本「登录」，点击事件绑 `LoginPanel.onLogin` |
| `BtnCreate` | Button | 文本「创建角色」，绑 `LoginPanel.onCreateRole` |

`LoginPanel` 节点挂 `ui/LoginPanel.ts`，把上面四个拖到对应 `@property`。

### 3.3 主界面面板（登录成功后显示）
建 `Canvas/HomePanel`：
| 节点 | 类型 | 绑定 |
|------|------|------|
| `RewardLabel` | Label | `HomePanel.rewardLabel` |
| `BtnClaim` | Button | 文本「领取离线收益」，绑 `HomePanel.onClaimOffline` |
| `BtnBattle` | Button | 文本「进入秘境」，切换到战斗面板 |
| `BtnEquip` | Button | 文本「装备」，显示装备面板 |
| `BtnRank` | Button | 文本「排行榜」，显示排行榜面板 |

### 3.4 战斗 / 装备 / 灵宠 / 排行榜面板（同法，各一个 Label + 按钮）
- `BattlePanel`（挂 `ui/BattlePanel.ts`）：`ResultLabel` + `BtnStart`（绑 `onStartBattle`）
- `EquipPanel`（挂 `ui/EquipPanel.ts`）：`ListLabel` + `BtnRefresh`（`onRefresh`）+ `BtnStrengthen`（`onStrengthenFirst`）
- `PetPanel`（挂 `ui/PetPanel.ts`）：`ListLabel` + `BtnRefresh`
- `RankPanel`（挂 `ui/RankPanel.ts`）：`ListLabel` + `BtnRefresh`

> 第一版先把所有面板平铺在 Canvas 上，用 `node.active` 切换显隐即可；后续再改弹窗/页面切换。

## 第四步：背景与视觉（可后置）

- `LoginPanel` 背景图：`login_bg.jpg`
- `HomePanel` 背景图：`scene_hang.jpg`
- `BattlePanel` 背景图：`scene_dungeon.jpg`
- 战斗表现（怪物/飘字/特效动画）第一版**先跳过**，用文字结果代替；后续用 `game/BattleReplay.ts` 逐回合播动画。

## 第五步：启动连接（Boot 脚本）

在 `assets/scripts/` 下新建 `Boot.ts`，内容：

```ts
import { _decorator, Component } from 'cc';
import { NetManager } from './core/NetManager';
const { ccclass } = _decorator;

@ccclass('Boot')
export class Boot extends Component {
  async start() {
    // 外网；本地调试改成 ws://127.0.0.1:8080/ws
    await NetManager.instance!.connect('wss://game.ct256.cn/ws');
  }
}
```

挂到 `Boot` 节点上。

## 第六步：运行验证清单

按顺序点，全部通过即 Demo 完成：

1. 点「创建角色」→ 状态显示「创建成功：xxx」
2. 点「领取离线收益」→ 显示「离线 3600 秒，领取：修为7200、铜钱18000」
3. 点「进入秘境」→「开始战斗」→ 显示「胜利 星级=3 回合=N 装备掉落=1」
4. 点「装备」→「刷新」→ 列出掉落的装备
5. 点「强化」→ 显示「强化成功，花费铜钱 100」
6. 点「排行榜」→ 显示「#1 测试玩家 战力…」

## 常见问题

- **连不上**：检查 NetManager 是否挂了、服务器是否在跑、开发者工具是否勾「不校验合法域名」。
- **protobufjs 报错**：确认 npm 依赖已装、脚本里 `import protobuf from 'protobufjs'` 能解析。
- **`.proto` 变更**：重新生成 `proto_sources.js`（在 `client-sdk` 下跑生成脚本）。

## 下一步（做完 Demo 后）

- 接美术动画（战斗回放、飘字）
- 微信 `code2session` 真实登录（后端代码见 `server/internal/game/wechat.go`）
- 装备精炼/灵宠进化等后端补全
