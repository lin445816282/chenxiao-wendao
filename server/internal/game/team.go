package game

import (
	"encoding/json"

	"chenxiao/internal/game/combat"
	"chenxiao/internal/store"
	"chenxiao/proto/common"
)

// 属性 ID（与配置表约定一致）：1=攻击 2=防御 3=生命。
const (
	attrATK = 1
	attrDEF = 2
	attrHP  = 3
)

// heroUnit 装配主角属性：裸装基础（随等级成长）+ 已穿戴装备（基础属性 + 随机词条 + 强化/精炼加成）。
func (s *Service) heroUnit(playerID int64) combat.Unit {
	// 裸装基础随等级成长：攻击 +30/级、防御 +8/级、生命 +300/级
	lv := int64(1)
	if p, err := store.GetPlayerByID(s.DB, playerID); err == nil {
		lv = int64(p.Level)
	}
	atk := int64(200) + (lv-1)*30
	def := int64(50) + (lv-1)*8
	hp := int64(2000) + (lv-1)*300
	list, _ := store.ListEquip(s.DB, playerID)
	for _, e := range list {
		if e.Pos == 0 { // 仅统计已穿戴装备
			continue
		}
		eq, ok := s.Config.GetEquip(e.EquipID)
		if !ok {
			continue
		}
		for _, a := range eq.BaseAttrs {
			switch a.AttrID {
			case attrATK:
				atk += a.Value
			case attrDEF:
				def += a.Value
			case attrHP:
				hp += a.Value
			}
		}
		if e.AffixesJSON != "" {
			var affixes []*common.EquipAffix
			if json.Unmarshal([]byte(e.AffixesJSON), &affixes) == nil {
				for _, af := range affixes {
					if ac, ok := s.Config.GetAffix(af.AffixId); ok {
						switch ac.AttrID {
						case attrATK:
							atk += int64(af.Value)
						case attrDEF:
							def += int64(af.Value)
						case attrHP:
							hp += int64(af.Value)
						}
					}
				}
			}
		}
		// 强化 +5 攻击/级，精炼 +3 攻击/级（成长反馈集中在输出端）
		atk += int64(e.StrengthenLevel)*5 + int64(e.RefineLevel)*3
	}
	return combat.Unit{
		UID: playerID, Kind: combat.KindRole, Name: "主角",
		MaxHP: hp, ATK: atk, DEF: def, Speed: 100,
		CritChance: 0.2, CritMult: 1.5, DodgeChance: 0.05,
	}
}

// petUnit 装配灵宠属性：基础属性 × 等级成长 × 星级成长。
func (s *Service) petUnit(p store.Pet) combat.Unit {
	pc, ok := s.Config.GetPet(p.PetID)
	if !ok {
		return mockPet(p.PetID)
	}
	var atk, def, hp int64
	for _, a := range pc.BaseAttrs {
		switch a.AttrID {
		case attrATK:
			atk = a.Value
		case attrDEF:
			def = a.Value
		case attrHP:
			hp = a.Value
		}
	}
	lvMult := 1.0 + 0.2*float64(p.Level-1)
	starMult := 1.0 + 0.2*float64(p.Star)
	atk = int64(float64(atk) * lvMult * starMult)
	def = int64(float64(def) * lvMult)
	hp = int64(float64(hp) * lvMult)
	if atk <= 0 {
		atk = 120
	}
	if def <= 0 {
		def = 40
	}
	if hp <= 0 {
		hp = 800
	}
	return combat.Unit{
		UID: int64(300000) + p.ID, Kind: combat.KindPet, Name: pc.Name,
		MaxHP: hp, ATK: atk, DEF: def, Speed: 90,
		CritChance: 0.1, CritMult: 1.5, DodgeChance: 0.05,
	}
}

// assembleTeam 返回我方出战阵容（主角 + 出战灵宠）。
func (s *Service) assembleTeam(playerID int64) []combat.Unit {
	units := []combat.Unit{s.heroUnit(playerID)}
	pets, _ := store.ListPet(s.DB, playerID)
	for _, p := range pets {
		if p.IsCombat {
			units = append(units, s.petUnit(p))
		}
	}
	return units
}

// unitPower 单位战力：攻击×2 + 防御 + 生命/10。
func unitPower(u combat.Unit) int64 {
	return u.ATK*2 + u.DEF + u.MaxHP/10
}

// teamPower 我方总战力（主角 + 出战灵宠）。
func (s *Service) teamPower(playerID int64) int64 {
	var total int64
	for _, u := range s.assembleTeam(playerID) {
		total += unitPower(u)
	}
	return total
}

// heroAttrs 返回主角装配后的三围（用于属性面板展示）。
func (s *Service) heroAttrs(playerID int64) (atk, def, hp int64) {
	u := s.heroUnit(playerID)
	return u.ATK, u.DEF, u.MaxHP
}
