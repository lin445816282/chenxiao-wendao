# 《尘霄问道》MySQL 表结构设计文档

> 版本：v0.1（原型阶段）
> 目标里程碑：M2 后端基础搭建
> 数据库：MySQL 8.0+，InnoDB，utf8mb4
> 配套：《尘霄问道》项目整体计划（V1.0 广告版，无充值）

---

## 1. 设计原则

1. **服务端权威**：玩家货币（铜钱/修为/材料）、装备、灵宠、关卡进度全部持久化在 MySQL，所有产出由服务端计算后写库。客户端只读快照用于展示，不参与数值结算。
2. **实例 ID 用雪花 ID**：`item_uid` / `pet_uid` / `mail_id` 等实例主键使用分布式雪花 ID（`BIGINT`），保证唯一、可排序、避免并发自增竞争，且为后续合服/多服留余地。
3. **逻辑外键，不建物理外键**：表中用 `player_id` 等字段关联，不建 `FOREIGN KEY`。游戏业务高频写，物理外键的锁与约束会拖慢写入；一致性由业务层保证。
4. **大字段序列化存 BLOB**：装备随机词条、邮件附件、灵宠技能等级等结构多变的数据，用 Protobuf 序列化后存 `BLOB`（或 `JSON`），避免为每种结构开列、频繁 DDL。
5. **时间戳双轨**：挂机/离线结算等需要做时间差运算的字段用 `BIGINT`（Unix 秒）；审计字段（`created_at`/`updated_at`）用 `DATETIME`，便于人工排查。
6. **货币流水留痕**：铜钱/修为/材料的所有增减写流水表，支持防作弊追溯与客服对账。
7. **排行榜走 Redis，MySQL 只存快照**：实时榜用 Redis ZSet，MySQL 存定时落库快照，避免高频写库。

---

## 2. 表清单总览

| 分类 | 表名 | 说明 |
|------|------|------|
| 账号/角色 | `t_account` | 微信 openid → 账号 |
| | `t_player` | 角色主表（等级/货币/挂机时间戳/进度） |
| 秘境 | `t_stage_progress` | 每关通关记录（星级/通关次数） |
| 装备 | `t_equip` | 装备实例（强化/精炼/随机词条） |
| 背包 | `t_bag_item` | 可堆叠物品（材料/消耗品/碎片） |
| 灵宠 | `t_pet` | 灵宠实例（等级/星级/技能/出战） |
| 邮件 | `t_mail` | 系统邮件（附件、领取状态） |
| 广告 | `t_ad_log` | 广告观看/发奖记录（频控、防刷） |
| 排行榜 | `t_rank_snapshot` | 排行榜 MySQL 快照 |
| 审计/流水 | `t_currency_log` | 货币/材料产出消耗流水 |
| | `t_item_log` | 物品获取/消耗流水 |
| | `t_login_log` | 登录日志 |
| 配置 | `t_config_version` | 导表配置版本控制 |

---

## 3. 账号 / 角色

### 3.1 `t_account` 账号表

微信 openid 与账号解耦，V1.0 一个 openid 一个角色，但为后续「同 openid 多角色/多服」预留。

```sql
CREATE TABLE `t_account` (
  `id`            BIGINT UNSIGNED NOT NULL COMMENT '账号ID(雪花)',
  `openid`        VARCHAR(64)  NOT NULL COMMENT '微信openid',
  `channel`       TINYINT      NOT NULL DEFAULT 0 COMMENT '渠道 0=微信小游戏',
  `unionid`       VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '微信unionid(可空)',
  `status`        TINYINT      NOT NULL DEFAULT 0 COMMENT '状态 0=正常 1=封禁',
  `last_login_at` BIGINT       NOT NULL DEFAULT 0 COMMENT '最近登录时间(Unix秒)',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账号表';
```

### 3.2 `t_player` 角色主表

挂机结算的核心时间戳都在这张表：`last_logout_at`、`last_offline_settle_at` 配合离线收益公式。

```sql
CREATE TABLE `t_player` (
  `id`              BIGINT UNSIGNED NOT NULL COMMENT '角色ID(雪花)',
  `account_id`      BIGINT UNSIGNED NOT NULL COMMENT '账号ID -> t_account.id',
  `server_id`       INT      NOT NULL DEFAULT 1 COMMENT '区服ID(预留)',
  `nickname`        VARCHAR(32) NOT NULL DEFAULT '' COMMENT '昵称',
  `avatar`          VARCHAR(255) NOT NULL DEFAULT '' COMMENT '头像URL',
  `level`           INT      NOT NULL DEFAULT 1 COMMENT '等级',
  `exp`             BIGINT   NOT NULL DEFAULT 0 COMMENT '修为(经验)',
  `copper`          BIGINT   NOT NULL DEFAULT 0 COMMENT '铜钱',
  `power`           BIGINT   NOT NULL DEFAULT 0 COMMENT '战力(冗余展示,服务端重算校验)',
  `vip_level`       TINYINT  NOT NULL DEFAULT 0 COMMENT 'VIP等级(V1.0恒为0)',
  -- 秘境进度(当前最高通关ID,用于挂机收益与解锁)
  `normal_stage_id` INT      NOT NULL DEFAULT 0 COMMENT '普通关卡最高已通关ID',
  `elite_stage_id`  INT      NOT NULL DEFAULT 0 COMMENT '精英关卡最高已通关ID',
  `boss_stage_id`   INT      NOT NULL DEFAULT 0 COMMENT 'BOSS关卡最高已通关ID',
  -- 挂机/离线结算时间戳
  `last_login_at`   BIGINT   NOT NULL DEFAULT 0 COMMENT '最近登录时间(Unix秒)',
  `last_logout_at`  BIGINT   NOT NULL DEFAULT 0 COMMENT '最近登出时间(Unix秒)',
  `last_offline_settle_at` BIGINT NOT NULL DEFAULT 0 COMMENT '上次离线结算截止时间(Unix秒)',
  `status`          TINYINT  NOT NULL DEFAULT 0 COMMENT '状态 0=正常 1=封禁',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_account` (`account_id`),
  KEY `idx_server_power` (`server_id`, `power` DESC)  -- 排行榜兜底查询
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色主表';
```

---

## 4. 秘境进度

### 4.1 `t_stage_progress`

逐关记录，支撑星级奖励、扫荡次数、重复挑战掉落衰减。

```sql
CREATE TABLE `t_stage_progress` (
  `id`            BIGINT UNSIGNED NOT NULL COMMENT '记录ID(雪花)',
  `player_id`     BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `stage_type`    TINYINT NOT NULL COMMENT '关卡类型 1=普通 2=精英 3=BOSS',
  `stage_id`      INT     NOT NULL COMMENT '关卡配置ID',
  `star`          TINYINT NOT NULL DEFAULT 0 COMMENT '本关最高星级 0-3',
  `clear_times`   INT     NOT NULL DEFAULT 0 COMMENT '通关次数',
  `first_clear_at` BIGINT NOT NULL DEFAULT 0 COMMENT '首通时间(Unix秒)',
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_player_stage` (`player_id`, `stage_type`, `stage_id`),
  KEY `idx_player_type` (`player_id`, `stage_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='秘境通关记录';
```

---

## 5. 装备

### 5.1 `t_equip` 装备实例表

- 每件装备一行，非堆叠。
- `pos` 表示穿戴位置：`0=背包`，`1..8=部位`（武器/头/衣/腿/鞋/项链/戒指/手镯）。
- `affixes` 为随机词条，Protobuf 序列化存 BLOB，避免列爆炸；`score` 冗余存储词条评分用于排序。

```sql
CREATE TABLE `t_equip` (
  `id`              BIGINT UNSIGNED NOT NULL COMMENT '装备实例ID(雪花)',
  `player_id`       BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `equip_id`        INT     NOT NULL COMMENT '装备配置ID -> 导表配置',
  `pos`             TINYINT NOT NULL DEFAULT 0 COMMENT '穿戴位置 0=背包 1..8=部位',
  `strengthen_level` INT    NOT NULL DEFAULT 0 COMMENT '强化等级',
  `refine_level`    INT     NOT NULL DEFAULT 0 COMMENT '精炼等级',
  `affix_count`     INT     NOT NULL DEFAULT 0 COMMENT '随机词条数量',
  `affixes`         BLOB    NULL COMMENT '随机词条(Protobuf序列化: repeated EquipAffix)',
  `score`           INT     NOT NULL DEFAULT 0 COMMENT '评分(用于排序/战力)',
  `is_locked`       TINYINT NOT NULL DEFAULT 0 COMMENT '是否锁定 0=否 1=是(防误分解)',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '获取时间',
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_player_pos` (`player_id`, `pos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='装备实例表';
```

> 词条结构（对应 proto `common.EquipAffix`）：
> `{ int32 affix_id; int32 value; }`，由配置表决定 `affix_id` 对应的属性与数值区间，**概率公示页引用同一配置表**，保证公示与实际一致。

---

## 6. 背包

### 6.1 `t_bag_item` 可堆叠物品表

材料、消耗品、灵宠碎片等可堆叠；装备走 `t_equip`。

```sql
CREATE TABLE `t_bag_item` (
  `id`          BIGINT UNSIGNED NOT NULL COMMENT '物品实例ID(雪花)',
  `player_id`   BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `item_id`     INT     NOT NULL COMMENT '物品配置ID -> 导表配置',
  `item_type`   TINYINT NOT NULL DEFAULT 0 COMMENT '物品类型 1=材料 2=消耗品 3=碎片 4=其他',
  `count`       INT     NOT NULL DEFAULT 0 COMMENT '数量(>0)',
  `is_bound`    TINYINT NOT NULL DEFAULT 0 COMMENT '是否绑定 0=否 1=是',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次获得时间',
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_player_item` (`player_id`, `item_id`, `is_bound`)  -- 同配置+同绑定态堆叠
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='背包物品表';
```

---

## 7. 灵宠

### 7.1 `t_pet` 灵宠实例表

- 同一 `pet_id` 可有多只（重复抽取合成升星），每只一行。
- `is_combat = 1` 表示出战助战，V1.0 暂定 1 出战位（+ 1 助战位预留）。

```sql
CREATE TABLE `t_pet` (
  `id`           BIGINT UNSIGNED NOT NULL COMMENT '灵宠实例ID(雪花)',
  `player_id`    BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `pet_id`       INT     NOT NULL COMMENT '灵宠配置ID -> 导表配置',
  `level`        INT     NOT NULL DEFAULT 1 COMMENT '等级',
  `exp`          BIGINT  NOT NULL DEFAULT 0 COMMENT '经验',
  `star`         INT     NOT NULL DEFAULT 1 COMMENT '星级(进化)',
  `skill_levels` BLOB    NULL COMMENT '技能等级(Protobuf: map<int32,int32> skillId->level)',
  `is_combat`    TINYINT NOT NULL DEFAULT 0 COMMENT '是否出战 0=否 1=是',
  `status`       TINYINT NOT NULL DEFAULT 0 COMMENT '状态 0=正常 1=已放生/分解',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_player_combat` (`player_id`, `is_combat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='灵宠实例表';
```

---

## 8. 邮件

### 8.1 `t_mail` 邮件表

附件里可包含物品/装备/灵宠，序列化存 BLOB。领取即从附件转出到背包，并置 `is_claimed`。

```sql
CREATE TABLE `t_mail` (
  `id`          BIGINT UNSIGNED NOT NULL COMMENT '邮件ID(雪花)',
  `player_id`   BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `mail_type`   TINYINT NOT NULL DEFAULT 1 COMMENT '类型 1=系统 2=补偿 3=活动',
  `title`       VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '标题',
  `content`     TEXT    NULL COMMENT '正文',
  `attachments` BLOB    NULL COMMENT '附件(Protobuf: repeated MailAttachment)',
  `is_read`     TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读 0=否 1=是',
  `is_claimed`  TINYINT NOT NULL DEFAULT 0 COMMENT '附件是否已领取 0=否 1=是',
  `expire_at`   BIGINT  NOT NULL DEFAULT 0 COMMENT '过期时间(Unix秒,0=不过期)',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发件时间',
  PRIMARY KEY (`id`),
  KEY `idx_player_read` (`player_id`, `is_read`, `is_claimed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮件表';
```

---

## 9. 广告（V1.0 变现核心）

### 9.1 `t_ad_log` 广告观看/发奖记录

用于：单日频控、同设备/同 openid 防刷、发奖幂等（`biz_id` 幂等键）。

```sql
CREATE TABLE `t_ad_log` (
  `id`          BIGINT UNSIGNED NOT NULL COMMENT '记录ID(雪花)',
  `player_id`   BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `ad_type`     TINYINT NOT NULL COMMENT '广告类型 1=激励视频 2=插屏',
  `scene`       TINYINT NOT NULL DEFAULT 0 COMMENT '触发场景(挂机倍率/材料/复活等)',
  `biz_id`      VARCHAR(64) NOT NULL DEFAULT '' COMMENT '幂等键(服务端生成的本次广告请求ID)',
  `reward`      VARCHAR(255) NOT NULL DEFAULT '' COMMENT '奖励快照(JSON,便于审计)',
  `status`      TINYINT NOT NULL DEFAULT 0 COMMENT '状态 0=请求 1=完成并发奖 2=未完成',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_biz` (`biz_id`),
  KEY `idx_player_day` (`player_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='广告记录表';
```

> 微信侧广告完成回调以服务端为准（server-side verification），客户端上报仅作参考，防本地篡改刷广告奖励。

---

## 10. 排行榜 / 审计流水 / 配置

### 10.1 `t_rank_snapshot` 排行榜快照

实时榜在 Redis ZSet；定时（如每 5 分钟）落一份快照到 MySQL，用于冷启动与审计。

```sql
CREATE TABLE `t_rank_snapshot` (
  `id`          BIGINT UNSIGNED NOT NULL COMMENT '快照ID(雪花)',
  `rank_type`   TINYINT NOT NULL COMMENT '榜单类型 1=战力 2=秘境层数 3=等级',
  `player_id`   BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `rank_no`     INT     NOT NULL DEFAULT 0 COMMENT '名次',
  `score`       BIGINT  NOT NULL DEFAULT 0 COMMENT '榜单分数',
  `snapshot_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '快照时间',
  PRIMARY KEY (`id`),
  KEY `idx_type_snapshot` (`rank_type`, `snapshot_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排行榜快照';
```

### 10.2 `t_currency_log` 货币流水（审计）

```sql
CREATE TABLE `t_currency_log` (
  `id`        BIGINT UNSIGNED NOT NULL COMMENT '流水ID(雪花)',
  `player_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `currency`  TINYINT NOT NULL COMMENT '货币类型 1=铜钱 2=修为 3=材料',
  `item_id`   INT     NOT NULL DEFAULT 0 COMMENT '若为材料,填材料配置ID',
  `change`    BIGINT  NOT NULL COMMENT '变化量(正加负减)',
  `balance`   BIGINT  NOT NULL COMMENT '变化后余额',
  `reason`    INT     NOT NULL COMMENT '原因枚举(挂机/战斗掉落/强化消耗/邮件/广告等)',
  `biz_id`    VARCHAR(64) NOT NULL DEFAULT '' COMMENT '业务幂等键',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
  PRIMARY KEY (`id`),
  KEY `idx_player_time` (`player_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='货币/材料流水表';
```

### 10.3 `t_item_log` 物品流水（审计）

```sql
CREATE TABLE `t_item_log` (
  `id`        BIGINT UNSIGNED NOT NULL COMMENT '流水ID(雪花)',
  `player_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `item_id`   INT     NOT NULL COMMENT '物品配置ID',
  `item_uid`  BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '实例ID(装备/灵宠时非0)',
  `change`    INT     NOT NULL COMMENT '变化量(正加负减)',
  `reason`    INT     NOT NULL COMMENT '原因枚举',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
  PRIMARY KEY (`id`),
  KEY `idx_player_time` (`player_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物品流水表';
```

### 10.4 `t_login_log` 登录日志

```sql
CREATE TABLE `t_login_log` (
  `id`         BIGINT UNSIGNED NOT NULL COMMENT '日志ID(雪花)',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT '账号ID',
  `player_id`  BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '角色ID(未创建角色为0)',
  `ip`         VARCHAR(64) NOT NULL DEFAULT '' COMMENT '客户端IP',
  `device`     VARCHAR(128) NOT NULL DEFAULT '' COMMENT '设备信息',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  PRIMARY KEY (`id`),
  KEY `idx_account_time` (`account_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志';
```

### 10.5 `t_config_version` 导表配置版本

```sql
CREATE TABLE `t_config_version` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `config_name` VARCHAR(64) NOT NULL COMMENT '配置表名(如 stage/equip/pet)',
  `version`     VARCHAR(32) NOT NULL COMMENT '版本号(如 20250101_01)',
  `checksum`    VARCHAR(64) NOT NULL DEFAULT '' COMMENT '校验和(MD5,防配置不一致)',
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config` (`config_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配置版本表';
```

---

## 11. 关键设计说明

### 11.1 离线挂机结算（服务端权威）

结算公式由服务端配置表驱动，**客户端不参与**：

```
收益 = f(最高通关关卡产出系数, 离线时长, 等级修正)
```

- 玩家登出时写 `last_logout_at`；上线时服务端读该时间到当前时间差 `ΔT`。
- `ΔT` 封顶（如 24h，超出部分不结算），受防沉迷/挂机倍率（广告加成）影响。
- 结算结果先落 `t_currency_log` / `t_item_log`，再更新 `t_player` 余额，**事务保证原子性**。
- 结算完成后刷新 `last_offline_settle_at`，防止重复领取。

### 11.2 战斗服务端权威

战斗全流程在 GameServer 内存中结算，结果一次性写库：
- 出战阵容（角色 + 灵宠）由客户端发起请求时携带，服务端校验合法性（是否拥有、是否出战）。
- 服务端跑完整回合结算，产出 `S2C_StageResult`（含回合序列、掉落、货币奖励）。
- 客户端只按回合序列播表现动画/飘字，**不参与任何数值计算**。
- 掉落写 `t_equip` / `t_bag_item` + 流水，与货币结算同事务。

### 11.3 分表 / 扩容预留

- 所有实例表按 `player_id` 预留分片；V1.0 单库即可，字段设计已支持后续分库分表（无全局自增冲突，靠雪花 ID）。
- `t_mail`、流水表是天然的大表，上线后可做按月归档或分表。

### 11.4 与 Redis 的边界

| 数据 | 存储 | 说明 |
|------|------|------|
| 玩家在线态/会话 | Redis | `token -> player_id`，登录态 TTL |
| 排行榜 | Redis ZSet | 实时榜，定时落 MySQL 快照 |
| 战斗/挂机临时态 | Redis | 离线结算中间结果、限流、幂等 |
| 玩家持久化数据 | MySQL | 角色/装备/灵宠/邮件等 |

---

## 12. 下一步待补

- [ ] 各表字段与导表 Excel（关卡/装备/灵宠/词条/掉落）的映射清单
- [ ] 挂机收益、战斗、掉落公式的具体数值表（Excel 导表，M2 阶段产出）
- [ ] 分库分表/合服方案（上线后迭代，V1.0 不需要）
