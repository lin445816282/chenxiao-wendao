// Package config 定义数值配置结构并加载导表产物（JSON）。
// 正式流程：Excel -> 导表工具 -> JSON -> 本包加载；字段 json tag 与导表列名对齐。
package config

// Attr 属性键值（attr_id 由配置表定义，如 1=攻击 2=防御 3=生命）。
type Attr struct {
	AttrID int32 `json:"attr_id"`
	Value  int64 `json:"value"`
}

// Stage 秘境关卡配置。
type Stage struct {
	ID              int32   `json:"id"`
	Type            int32   `json:"type"` // 1=普通 2=精英 3=BOSS
	Name            string  `json:"name"`
	RecommendPower  int64   `json:"recommend_power"`
	MonsterIDs      []int32 `json:"monster_ids"`
	BossID          int32   `json:"boss_id"`
	ExpReward       int64   `json:"exp_reward"`
	CopperReward    int64   `json:"copper_reward"`
	DropTableID     int32   `json:"drop_table_id"`
	UnlockPrevStage int32   `json:"unlock_prev_stage"` // 0=无前置
}

// Equip 装备配置。
type Equip struct {
	ID            int32   `json:"id"`
	Name          string  `json:"name"`
	Pos           int32   `json:"pos"`     // 1..8 部位
	Quality       int32   `json:"quality"` // 1凡 2灵 3玄 4地 5天
	BaseAttrs     []Attr  `json:"base_attrs"`
	AffixPool     []int32 `json:"affix_pool"` // 可随机到的词条 ID
	MaxStrengthen int32   `json:"max_strengthen"`
	MaxRefine     int32   `json:"max_refine"`
}

// PetSkill 灵宠技能配置。
type PetSkill struct {
	SkillID  int32 `json:"skill_id"`
	MaxLevel int32 `json:"max_level"`
}

// Pet 灵宠配置。
type Pet struct {
	ID        int32      `json:"id"`
	Name      string     `json:"name"`
	Rarity    int32      `json:"rarity"`
	BaseAttrs []Attr     `json:"base_attrs"`
	Skills    []PetSkill `json:"skills"`
}

// Affix 随机词条配置（装备掉落的随机属性）。
type Affix struct {
	ID     int32  `json:"id"`
	Name   string `json:"name"`
	AttrID int32  `json:"attr_id"`
	Min    int32  `json:"min"`
	Max    int32  `json:"max"`
}

// DropEntry 掉落条目（weight 为权重，越大越容易中）。
type DropEntry struct {
	ItemID   int32 `json:"item_id"`
	Weight   int32 `json:"weight"`
	CountMin int32 `json:"count_min"`
	CountMax int32 `json:"count_max"`
}

// DropTable 掉落表。
type DropTable struct {
	ID      int32       `json:"id"`
	Entries []DropEntry `json:"entries"`
}

// Hang 挂机/离线收益公式配置（服务端权威结算依据）。
type Hang struct {
	MaxOfflineSeconds int64 `json:"max_offline_seconds"` // 离线结算时长封顶
	ExpPerSecond      int64 `json:"exp_per_second"`      // 基础修为/秒
	CopperPerSecond   int64 `json:"copper_per_second"`   // 基础铜钱/秒
	AdMultiplier      int32 `json:"ad_multiplier"`       // 广告加成倍率
}

// ConfigSet 全部配置与索引。
type ConfigSet struct {
	Stages     []Stage     `json:"stages"`
	Equips     []Equip     `json:"equips"`
	Pets       []Pet       `json:"pets"`
	DropTables []DropTable `json:"drop_tables"`
	Affixes    []Affix     `json:"affixes"`
	Hang       Hang        `json:"hang"`

	stageIdx map[int32]Stage
	equipIdx map[int32]Equip
	petIdx   map[int32]Pet
	dropIdx  map[int32]DropTable
	affixIdx map[int32]Affix
}

// GetStage / GetEquip / GetPet / GetDropTable 返回配置与是否存在。
func (cs *ConfigSet) GetStage(id int32) (Stage, bool) {
	v, ok := cs.stageIdx[id]
	return v, ok
}
func (cs *ConfigSet) GetEquip(id int32) (Equip, bool) {
	v, ok := cs.equipIdx[id]
	return v, ok
}
func (cs *ConfigSet) GetPet(id int32) (Pet, bool) {
	v, ok := cs.petIdx[id]
	return v, ok
}
func (cs *ConfigSet) GetDropTable(id int32) (DropTable, bool) {
	v, ok := cs.dropIdx[id]
	return v, ok
}
func (cs *ConfigSet) GetAffix(id int32) (Affix, bool) {
	v, ok := cs.affixIdx[id]
	return v, ok
}
