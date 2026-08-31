# 《尘霄问道》豆包素材批量生成工具

用豆包（火山方舟 Ark）批量生成两类素材：
- **文案**：世界观、境界、宗门、灵宠、装备/材料命名、关卡、开场剧情（文本大模型）
- **美术**：主角立绘、灵宠、怪物、BOSS、场景、图标、登录图（**Seedream 5.0 Pro**，仙侠水墨国风）

## 1. 前置

- Node.js ≥ 18（本项目实测 v24 可用），无需安装任何 npm 依赖（用内置 `fetch`）。
- 一个火山方舟 API Key（控制台 [console.volcengine.com/ark](https://console.volcengine.com/ark) 的「API Key 管理」里创建，形如 `ark-xxxx-...`，不是 `apikey-` 前缀）。

## 2. 配置

`config.json`：

| 字段 | 说明 |
|------|------|
| `text_model` | 文案模型，默认 `doubao-1-5-pro-32k-250115` |
| `image_model` | 图片模型，默认 `doubao-seedream-5-0-260128`（Seedream 5.0 Pro，国风仙侠/游戏立绘首选） |
| `steps` | 采样步数，默认 30（文档推荐 25-35，游戏美术固定 30） |
| `cfg_scale` | 提示词权重，默认 7.5（推荐 7-9） |
| `seed` | 固定随机种子（uint64）。设成固定值可复现同一张图，做系列角色统一画风；`null` 为随机 |
| `default_size` | 图片默认尺寸（如 `1920x1920`），各素材在 `prompts.json` 单独覆盖 |
| `watermark` | 是否带水印，游戏素材建议 `false`（无权限会报错，再改回 `true`） |

> **Key 不要写进 `config.json`**（`api_key` 字段留空）。运行时用 `--key` 或环境变量 `ARK_API_KEY` 传入。

## 3. 运行

```bash
cd chenxiao-wendao/tools/gen_assets

# 先看要执行哪些项（不发请求）
node generate.mjs --key <你的key> --dry-run

# 全部生成
node generate.mjs --key <你的key>

# 只要文案 / 只要图片
node generate.mjs --key <你的key> --type text
node generate.mjs --key <你的key> --type image

# 只生成指定 id（逗号分隔）
node generate.mjs --key <你的key> --id hero_male,pets
```

## 4. 输出

```
tools/gen_assets/output/
├── text/     # 文案，.md 文件
└── images/   # 图片，.jpg 文件（Seedream 5.0 实际输出 JPEG）
```

## 5. 提示词结构（依据 Seedream 文档）

图片正向提示词由脚本自动拼装：

```
style_prefix + (character_suffix, 仅角色类) + item.prompt
```

- `style_prefix`（全局画质）：`8k,超高清,电影级光影,仙侠水墨国风,柔和体积光,细节丰富,极致材质质感,构图完整`
- `character_suffix`（角色/灵宠/怪物类）：`细腻皮肤,精致古风服饰,金银刺绣纹样,完整全身立绘,纯色干净背景,人物居中`
- `negative_prompt`（全局反向，规避人体缺陷）：`畸形,多手指,缺手指,扭曲肢体,五官崩坏,模糊,水印,文字,签名,噪点,丑陋,变形,重复肢体,黑白,灰暗`

**分辨率**（用 `size` 字符串，如 `"1440x2560"`）：实际要求像素总数 ≥ 3,686,400（≈1920×1920）。本项目用：方图 `1920x1920`、竖版 9:16 `1440x2560`、横版 16:9 `2560x1440`。

## 6. 定制素材

编辑 `prompts.json`：
- `style_prefix` / `character_suffix` / `negative_prompt`：全局风格（改风格只需动这里，如把「仙侠水墨国风」换成「国漫仙侠风格」）。
- `items[]`：每个素材一个条目，字段 `id / type(text|image) / title / prompt / character(仅角色类) / size / seed(可选) / output`。

## 7. 常见问题

- **`AuthenticationError: The API key format is incorrect`**：key 格式不对，请确认是火山方舟控制台创建的随机字符串 key（脚本自动加 `Bearer`）。
- **分辨率报错**：`size` 需满足像素总数 ≥ 3,686,400（约 1920×1920），如 `1920x1920` / `1440x2560` / `2560x1440`；低于该值会报错。
- **水印报错**：部分账号无「无水印」权限，把 `config.json` 的 `watermark` 改成 `true`。
- **图标质量差**：Seedream 对极度精细 UI 图标生成效果一般（文档已注明），`icon_weapon`/`icon_armor` 生成后建议 PS 精修。

## 8. 版权与合规

- **不能传入受版权保护的 IP 角色名**（Seedream 约束）；提示词已全部改为原创描述，正式上线前仍建议人工二次审查命名与形象。
- 图片为 AI 生成，商用前请确认火山方舟的服务条款与授权范围；上线提审时随合规材料说明素材来源。
