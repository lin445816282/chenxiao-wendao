# Excel → JSON 导表工具

把 `server/excel/*.xlsx` 转成 `server/configs/*.json`，供 `internal/config` 加载。

## 1. 安装

```bash
cd server/tools/excel2json
npm install
```

## 2. 使用

```bash
# 生成示例 Excel（可选，演示表头与填写约定）
node make_samples.cjs

# 执行导表
node export.cjs
# 或在 server/ 目录下：make excel2json
```

输出到 `server/configs/`，与 Go 结构体 `internal/config/types.go` 的 json tag 一一对应。

## 3. 表结构（`export.cjs` 里的 SCHEMA）

| 表 | Excel | Sheet | 输出 | 模式 |
|----|-------|-------|------|------|
| 关卡 | stage.xlsx | stage | stage.json | array（多行） |
| 装备 | equip.xlsx | equip | equip.json | array |
| 灵宠 | pet.xlsx | pet | pet.json | array |
| 掉落 | drop.xlsx | drop | drop.json | array |
| 挂机公式 | hang.xlsx | hang | hang.json | object（单行） |

## 4. 单元格填写约定

第一行为表头（列名），从第二行起每行一条记录。复杂字段用字符串 + 分隔符：

| 类型 | 填写示例 | 解析结果 |
|------|----------|----------|
| `int` | `1001` | 整数 |
| `string` | `尘息小径` | 字符串 |
| `int[]` | `101,102` | `[101, 102]` |
| `attr[]` | `1:100,3:150` | `[{attr_id:1,value:100},{attr_id:3,value:150}]` |
| `skill[]` | `4001:10,4002:10` | `[{skill_id:4001,max_level:10},...]` |
| `drop[]` | `2001:100:1:1;5001:50:1:3` | `[{item_id,weight,count_min,count_max},...]`（条目用 `;` 分隔） |

> 支持中英文逗号/分号混用（`，；` 也会被识别），方便在中文 Excel 里录入。

## 5. 新增一张表

1. 在 `export.cjs` 的 `SCHEMA` 加一项（`table/excel/sheet/output/mode/columns`）；
2. 在 `internal/config/types.go` 加对应结构体 + json tag；
3. 在 `internal/config/loader.go` 加一行 `loadJSON(...)`。

## 6. 说明

- 正式流程：策划维护 Excel → `make excel2json` 生成 JSON → 后端加载并建索引（`loader.go` 的 `buildIndex`）。
- 配置表版本一致性可用 `checksum`（见 `docs/01-database-design.md` 的 `t_config_version`）。
