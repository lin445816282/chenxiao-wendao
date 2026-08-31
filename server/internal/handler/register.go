package handler

import (
	"chenxiao/internal/game"
	"chenxiao/internal/msgid"
)

// RegisterAll 注册全部业务 handler（svc 为持有配置/存储的业务服务）。
func RegisterAll(d *Dispatcher, svc *game.Service) {
	// 登录/角色
	d.Register(msgid.C2SLogin, svc.OnLogin)
	d.Register(msgid.C2SCreateRole, svc.OnCreateRole)

	// 挂机/离线
	d.Register(msgid.C2SOfflineRewardQuery, svc.OnOfflineRewardQuery)
	d.Register(msgid.C2SOfflineRewardClaim, svc.OnOfflineRewardClaim)
	d.Register(msgid.C2SHangRewardQuery, svc.OnHangRewardQuery)
	d.Register(msgid.C2SHangRewardClaim, svc.OnHangRewardClaim)

	// 秘境/战斗
	d.Register(msgid.C2SStartStage, svc.OnStartStage)
	d.Register(msgid.C2SSweepStage, svc.OnSweepStage)

	// 装备
	d.Register(msgid.C2SEquipList, svc.OnEquipList)
	d.Register(msgid.C2SEquipWear, svc.OnEquipWear)
	d.Register(msgid.C2SEquipStrengthen, svc.OnEquipStrengthen)
	d.Register(msgid.C2SEquipRefine, svc.OnEquipRefine)
	d.Register(msgid.C2SEquipDecompose, svc.OnEquipDecompose)

	// 灵宠
	d.Register(msgid.C2SPetList, svc.OnPetList)
	d.Register(msgid.C2SPetSetCombat, svc.OnPetSetCombat)
	d.Register(msgid.C2SPetUpgrade, svc.OnPetUpgrade)
	d.Register(msgid.C2SPetEvolve, svc.OnPetEvolve)

	// 背包
	d.Register(msgid.C2SBagList, svc.OnBagList)
	d.Register(msgid.C2SBagUseItem, svc.OnBagUseItem)

	// 邮件
	d.Register(msgid.C2SMailList, svc.OnMailList)
	d.Register(msgid.C2SMailRead, svc.OnMailRead)
	d.Register(msgid.C2SMailClaim, svc.OnMailClaim)

	// 排行榜
	d.Register(msgid.C2SRankQuery, svc.OnRankQuery)

	// 广告
	d.Register(msgid.C2SAdRequest, svc.OnAdRequest)
	d.Register(msgid.C2SAdReport, svc.OnAdReport)
}
