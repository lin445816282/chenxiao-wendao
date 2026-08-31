// Package msgid 定义消息 ID 常量，与 proto/common.proto 的 MsgId 枚举一一对应。
// 生成 proto 代码后，也可改用 common.MsgId_xxx 常量，本包便于在未生成 proto 时解耦框架层。
package msgid

const (
	// ---- 心跳/通用 1-99 ----
	C2SHeartbeat = 1
	S2CHeartbeat = 2
	S2CKick      = 3

	// ---- 登录/角色 1000-1099 ----
	C2SLogin      = 1000
	S2CLogin      = 1001
	C2SCreateRole = 1002
	S2CCreateRole = 1003
	S2CRoleBrief  = 1004

	// ---- 挂机/离线 2000-2099 ----
	C2SOfflineRewardQuery = 2000
	S2COfflineRewardQuery = 2001
	C2SOfflineRewardClaim = 2002
	S2COfflineRewardClaim = 2003
	C2SHangRewardQuery    = 2004
	S2CHangRewardQuery    = 2005
	C2SHangRewardClaim    = 2006
	S2CHangRewardClaim    = 2007

	// ---- 秘境/战斗 3000-3099 ----
	C2SStartStage = 3000
	S2CStartStage = 3001
	C2SSweepStage = 3002
	S2CSweepStage = 3003

	// ---- 装备 4000-4099 ----
	C2SEquipList      = 4000
	S2CEquipList      = 4001
	C2SEquipWear      = 4002
	S2CEquipWear      = 4003
	C2SEquipStrengthen = 4004
	S2CEquipStrengthen = 4005
	C2SEquipRefine    = 4006
	S2CEquipRefine    = 4007
	C2SEquipDecompose = 4008
	S2CEquipDecompose = 4009

	// ---- 灵宠 5000-5099 ----
	C2SPetList      = 5000
	S2CPetList      = 5001
	C2SPetSetCombat = 5002
	S2CPetSetCombat = 5003
	C2SPetUpgrade   = 5004
	S2CPetUpgrade   = 5005
	C2SPetEvolve    = 5006
	S2CPetEvolve    = 5007

	// ---- 背包 6000-6099 ----
	C2SBagList    = 6000
	S2CBagList    = 6001
	C2SBagUseItem = 6002
	S2CBagUseItem = 6003

	// ---- 邮件 7000-7099 ----
	C2SMailList  = 7000
	S2CMailList  = 7001
	C2SMailRead  = 7002
	S2CMailRead  = 7003
	C2SMailClaim = 7004
	S2CMailClaim = 7005

	// ---- 排行榜 8000-8099 ----
	C2SRankQuery = 8000
	S2CRankQuery = 8001

	// ---- 广告 9000-9099 ----
	C2SAdRequest = 9000
	S2CAdRequest = 9001
	C2SAdReport  = 9002
	S2CAdReport  = 9003
)
