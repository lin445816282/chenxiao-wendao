package game

import (
	"context"
	"encoding/json"

	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/common"
	"chenxiao/proto/equip"

	"google.golang.org/protobuf/proto"
)

// equipInfo 把存储的装备转成 proto 结构（含解析随机词条与评分）。
func (s *Service) equipInfo(e store.Equip) *equip.EquipInfo {
	info := &equip.EquipInfo{
		EquipUid:        e.ID,
		EquipId:         e.EquipID,
		Pos:             e.Pos,
		StrengthenLevel: e.StrengthenLevel,
		RefineLevel:     e.RefineLevel,
		Score:           s.equipScore(e),
	}
	if e.AffixesJSON != "" {
		var affixes []*common.EquipAffix
		if json.Unmarshal([]byte(e.AffixesJSON), &affixes) == nil {
			info.Affixes = affixes
		}
	}
	return info
}

// equipScore 装备评分：基础属性 + 词条 + 强化×5 + 精炼×3（用于一键穿戴排序）。
func (s *Service) equipScore(e store.Equip) int32 {
	score := int64(0)
	if eq, ok := s.Config.GetEquip(e.EquipID); ok {
		for _, a := range eq.BaseAttrs {
			score += a.Value
		}
	}
	if e.AffixesJSON != "" {
		var affixes []*common.EquipAffix
		if json.Unmarshal([]byte(e.AffixesJSON), &affixes) == nil {
			for _, af := range affixes {
				score += int64(af.Value)
			}
		}
	}
	score += int64(e.StrengthenLevel)*5 + int64(e.RefineLevel)*3
	return int32(score)
}

// OnEquipList 装备列表（查库）。
func (s *Service) OnEquipList(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &equip.C2SEquipList{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CEquipList, &equip.S2CEquipList{Result: okResult(), Equips: []*equip.EquipInfo{}})
	}
	list, _ := store.ListEquip(s.DB, p.ID)
	infos := make([]*equip.EquipInfo, 0, len(list))
	for _, e := range list {
		infos = append(infos, s.equipInfo(e))
	}
	resp := &equip.S2CEquipList{Result: okResult(), Equips: infos}
	return respond(msgid.S2CEquipList, resp)
}

// OnEquipStrengthen 强化：扣铜钱，强化等级 +1。
func (s *Service) OnEquipStrengthen(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &equip.C2SEquipStrengthen{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CEquipStrengthen, &equip.S2CEquipStrengthen{
			Result: &common.Result{Code: common.ErrorCode_ERR_EQUIP_NOT_FOUND},
		})
	}
	e, err := store.GetEquip(s.DB, req.EquipUid)
	if err != nil || e.PlayerID != p.ID {
		return respond(msgid.S2CEquipStrengthen, &equip.S2CEquipStrengthen{
			Result: &common.Result{Code: common.ErrorCode_ERR_EQUIP_NOT_FOUND},
		})
	}

	cost := int64(100 * (e.StrengthenLevel + 1)) // 简单线性费用
	if err := store.DeductCopper(s.DB, p.ID, cost); err != nil {
		return respond(msgid.S2CEquipStrengthen, &equip.S2CEquipStrengthen{
			Result: &common.Result{Code: common.ErrorCode_ERR_COPPER_NOT_ENOUGH},
		})
	}
	lv, err := store.StrengthenEquip(s.DB, e.ID)
	if err != nil {
		return respond(msgid.S2CEquipStrengthen, &equip.S2CEquipStrengthen{
			Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL},
		})
	}
	e.StrengthenLevel = lv
	resp := &equip.S2CEquipStrengthen{Result: okResult(), CopperCost: cost, Equip: s.equipInfo(*e)}
	return respond(msgid.S2CEquipStrengthen, resp)
}

// OnEquipWear 穿戴/脱下：设置装备位置（0=背包，1-8=部位）。
func (s *Service) OnEquipWear(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &equip.C2SEquipWear{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CEquipWear, &equip.S2CEquipWear{Result: &common.Result{Code: common.ErrorCode_ERR_EQUIP_NOT_FOUND}})
	}
	e, err := store.GetEquip(s.DB, req.EquipUid)
	if err != nil || e.PlayerID != p.ID {
		return respond(msgid.S2CEquipWear, &equip.S2CEquipWear{Result: &common.Result{Code: common.ErrorCode_ERR_EQUIP_NOT_FOUND}})
	}
	// 穿戴时先脱下该部位旧装备，保证同部位唯一（避免属性叠加）
	if req.TargetPos > 0 {
		if err := store.UnwearPos(s.DB, p.ID, req.TargetPos); err != nil {
			return respond(msgid.S2CEquipWear, &equip.S2CEquipWear{Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL}})
		}
	}
	if err := store.SetEquipPos(s.DB, e.ID, req.TargetPos); err != nil {
		return respond(msgid.S2CEquipWear, &equip.S2CEquipWear{Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL}})
	}
	e.Pos = req.TargetPos
	resp := &equip.S2CEquipWear{Result: okResult(), Changed: []*equip.EquipInfo{s.equipInfo(*e)}}
	return respond(msgid.S2CEquipWear, resp)
}

// OnEquipRefine 精炼：扣铜钱，精炼等级 +1。
func (s *Service) OnEquipRefine(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &equip.C2SEquipRefine{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CEquipRefine, &equip.S2CEquipRefine{Result: &common.Result{Code: common.ErrorCode_ERR_EQUIP_NOT_FOUND}})
	}
	e, err := store.GetEquip(s.DB, req.EquipUid)
	if err != nil || e.PlayerID != p.ID {
		return respond(msgid.S2CEquipRefine, &equip.S2CEquipRefine{Result: &common.Result{Code: common.ErrorCode_ERR_EQUIP_NOT_FOUND}})
	}

	cost := int64(200 * (e.RefineLevel + 1)) // 精炼费用
	if err := store.DeductCopper(s.DB, p.ID, cost); err != nil {
		return respond(msgid.S2CEquipRefine, &equip.S2CEquipRefine{Result: &common.Result{Code: common.ErrorCode_ERR_COPPER_NOT_ENOUGH}})
	}
	lv, err := store.RefineEquip(s.DB, e.ID)
	if err != nil {
		return respond(msgid.S2CEquipRefine, &equip.S2CEquipRefine{Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL}})
	}
	e.RefineLevel = lv
	resp := &equip.S2CEquipRefine{Result: okResult(), Equip: s.equipInfo(*e)}
	return respond(msgid.S2CEquipRefine, resp)
}

// OnEquipDecompose 分解：删除装备，按强化/精炼返还铜钱。
func (s *Service) OnEquipDecompose(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &equip.C2SEquipDecompose{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CEquipDecompose, &equip.S2CEquipDecompose{Result: &common.Result{Code: common.ErrorCode_ERR_EQUIP_NOT_FOUND}})
	}
	var totalCopper int64
	for _, uid := range req.EquipUids {
		e, err := store.GetEquip(s.DB, uid)
		if err != nil || e.PlayerID != p.ID {
			continue
		}
		if store.DeleteEquip(s.DB, uid, p.ID) == nil {
			totalCopper += int64(50 + e.StrengthenLevel*20 + e.RefineLevel*30)
		}
	}
	if totalCopper > 0 {
		store.AddResources(s.DB, p.ID, 0, totalCopper)
	}
	resp := &equip.S2CEquipDecompose{Result: okResult(), Rewards: []*common.RewardItem{{ItemId: 1, Count: totalCopper}}}
	return respond(msgid.S2CEquipDecompose, resp)
}
