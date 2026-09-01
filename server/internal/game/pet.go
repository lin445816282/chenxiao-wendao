package game

import (
	"context"

	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/common"
	"chenxiao/proto/pet"

	"google.golang.org/protobuf/proto"
)

// petInfo 把存储的灵宠转成 proto 结构。
func petInfo(p store.Pet) *pet.PetInfo {
	return &pet.PetInfo{
		PetUid: p.ID, PetId: p.PetID, Level: p.Level, Exp: p.Exp, Star: p.Star, IsCombat: p.IsCombat,
	}
}

// OnPetList 灵宠列表（查库）。
func (s *Service) OnPetList(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &pet.C2SPetList{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CPetList, &pet.S2CPetList{Result: okResult(), Pets: []*pet.PetInfo{}})
	}
	list, _ := store.ListPet(s.DB, p.ID)
	infos := make([]*pet.PetInfo, 0, len(list))
	for _, pp := range list {
		infos = append(infos, petInfo(pp))
	}
	resp := &pet.S2CPetList{Result: okResult(), Pets: infos}
	return respond(msgid.S2CPetList, resp)
}

// maxCombatPets 出战位随等级解锁：30 级 2 位，60 级 3 位，其余 1 位。
func maxCombatPets(level int32) int {
	switch {
	case level >= 60:
		return 3
	case level >= 30:
		return 2
	}
	return 1
}

// OnPetSetCombat 出战/休息。
func (s *Service) OnPetSetCombat(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &pet.C2SPetSetCombat{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CPetSetCombat, &pet.S2CPetSetCombat{Result: &common.Result{Code: common.ErrorCode_ERR_PET_NOT_FOUND}})
	}
	pt, err := store.GetPet(s.DB, req.PetUid)
	if err != nil || pt.PlayerID != p.ID {
		return respond(msgid.S2CPetSetCombat, &pet.S2CPetSetCombat{Result: &common.Result{Code: common.ErrorCode_ERR_PET_NOT_FOUND}})
	}
	// 出战前校验出战位上限（已出战的重复设置视为幂等，放行）
	if req.Combat && !pt.IsCombat {
		if n, _ := store.CountCombatPet(s.DB, p.ID); n >= maxCombatPets(p.Level) {
			return respond(msgid.S2CPetSetCombat, &pet.S2CPetSetCombat{Result: &common.Result{Code: common.ErrorCode_ERR_PET_MAX}})
		}
	}
	if err := store.SetPetCombat(s.DB, pt.ID, req.Combat); err != nil {
		return respond(msgid.S2CPetSetCombat, &pet.S2CPetSetCombat{Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL}})
	}
	pt2, _ := store.GetPet(s.DB, pt.ID)
	resp := &pet.S2CPetSetCombat{Result: okResult(), Changed: []*pet.PetInfo{petInfo(*pt2)}}
	return respond(msgid.S2CPetSetCombat, resp)
}

// OnPetUpgrade 升级：扣铜钱 + 灵兽丹(5002)，等级 +1。
func (s *Service) OnPetUpgrade(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &pet.C2SPetUpgrade{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CPetUpgrade, &pet.S2CPetUpgrade{Result: &common.Result{Code: common.ErrorCode_ERR_PET_NOT_FOUND}})
	}
	pt, err := store.GetPet(s.DB, req.PetUid)
	if err != nil || pt.PlayerID != p.ID {
		return respond(msgid.S2CPetUpgrade, &pet.S2CPetUpgrade{Result: &common.Result{Code: common.ErrorCode_ERR_PET_NOT_FOUND}})
	}

	// 材料：灵兽丹 ×1
	if _, err := store.DeductBagItemByID(s.DB, p.ID, 5002, 1); err != nil {
		return respond(msgid.S2CPetUpgrade, &pet.S2CPetUpgrade{Result: &common.Result{Code: common.ErrorCode_ERR_MATERIAL_NOT_ENOUGH}})
	}
	cost := int64(50 * pt.Level)
	if err := store.DeductCopper(s.DB, p.ID, cost); err != nil {
		return respond(msgid.S2CPetUpgrade, &pet.S2CPetUpgrade{Result: &common.Result{Code: common.ErrorCode_ERR_COPPER_NOT_ENOUGH}})
	}
	lv, err := store.UpgradePet(s.DB, pt.ID)
	if err != nil {
		return respond(msgid.S2CPetUpgrade, &pet.S2CPetUpgrade{Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL}})
	}
	pt.Level = lv
	resp := &pet.S2CPetUpgrade{Result: okResult(), Pet: petInfo(*pt)}
	return respond(msgid.S2CPetUpgrade, resp)
}

// OnPetEvolve 进化：扣铜钱 + 进化石(5003)，星级 +1。
func (s *Service) OnPetEvolve(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &pet.C2SPetEvolve{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CPetEvolve, &pet.S2CPetEvolve{Result: &common.Result{Code: common.ErrorCode_ERR_PET_NOT_FOUND}})
	}
	pt, err := store.GetPet(s.DB, req.PetUid)
	if err != nil || pt.PlayerID != p.ID {
		return respond(msgid.S2CPetEvolve, &pet.S2CPetEvolve{Result: &common.Result{Code: common.ErrorCode_ERR_PET_NOT_FOUND}})
	}

	// 材料：进化石 ×1
	if _, err := store.DeductBagItemByID(s.DB, p.ID, 5003, 1); err != nil {
		return respond(msgid.S2CPetEvolve, &pet.S2CPetEvolve{Result: &common.Result{Code: common.ErrorCode_ERR_MATERIAL_NOT_ENOUGH}})
	}
	cost := int64(500 * pt.Star)
	if err := store.DeductCopper(s.DB, p.ID, cost); err != nil {
		return respond(msgid.S2CPetEvolve, &pet.S2CPetEvolve{Result: &common.Result{Code: common.ErrorCode_ERR_COPPER_NOT_ENOUGH}})
	}
	star, err := store.EvolvePet(s.DB, pt.ID)
	if err != nil {
		return respond(msgid.S2CPetEvolve, &pet.S2CPetEvolve{Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL}})
	}
	pt.Star = star
	resp := &pet.S2CPetEvolve{Result: okResult(), Pet: petInfo(*pt)}
	return respond(msgid.S2CPetEvolve, resp)
}
