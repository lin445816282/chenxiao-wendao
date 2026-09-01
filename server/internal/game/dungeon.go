package game

import (
	"context"
	"encoding/json"
	"log"
	"math/rand"
	"time"

	"chenxiao/internal/game/combat"
	"chenxiao/internal/game/drop"
	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/common"
	"chenxiao/proto/dungeon"

	"google.golang.org/protobuf/proto"
)

// OnStartStage 开始战斗：服务端权威计算整场战斗，下发回合序列供客户端回放。
func (s *Service) OnStartStage(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &dungeon.C2SStartStage{}
	if err := proto.Unmarshal(body, req); err != nil {
		return respond(msgid.S2CStartStage, &dungeon.S2CStartStage{
			Result: &common.Result{Code: common.ErrorCode_ERR_INVALID_PARAM},
		})
	}
	stage, ok := s.Config.GetStage(req.StageId)
	if !ok {
		return respond(msgid.S2CStartStage, &dungeon.S2CStartStage{
			Result: &common.Result{Code: common.ErrorCode_ERR_STAGE_LOCKED},
		})
	}

	// 等级门槛校验：等级不足则拒绝开战
	var playerID int64
	if p, err := store.GetPlayerByAccount(s.DB, mockAccountID); err == nil {
		playerID = p.ID
		if stage.UnlockLevel > 0 && p.Level < stage.UnlockLevel {
			return respond(msgid.S2CStartStage, &dungeon.S2CStartStage{
				Result: &common.Result{Code: common.ErrorCode_ERR_STAGE_LOCKED},
			})
		}
	}

	// 我方：主角 + 出战灵宠（从存档/装备/灵宠装配真实属性）
	var attackers []combat.Unit
	if playerID > 0 {
		attackers = s.assembleTeam(playerID)
	} else {
		attackers = []combat.Unit{mockHero()}
	}
	// 敌方：关卡怪物（属性按 recommend_power 推导，TODO 接怪物配置表）
	defenders := make([]combat.Unit, 0, len(stage.MonsterIDs))
	for _, mid := range stage.MonsterIDs {
		defenders = append(defenders, mockMonster(mid, stage.RecommendPower, stage.Type))
	}

	res := combat.Simulate(attackers, defenders, 50, rand.New(rand.NewSource(time.Now().UnixNano())))

	resp := &dungeon.S2CStartStage{
		Result: okResult(),
		Win:    res.Win,
		Star:   calcStar(res),
		Rounds: toProtoRounds(res.Rounds),
	}

	// 掉落：胜利后按掉落表权重随机（普通 1 / 精英 2 / BOSS 3 次），装备/灵宠落库
	if res.Win {
		star := calcStar(res)
		if playerID > 0 {
			// 基础奖励：修为 + 铜钱（按关卡配置落库并下发）
			store.AddResources(s.DB, playerID, stage.ExpReward, stage.CopperReward)
			store.AddPetExp(s.DB, playerID, stage.ExpReward)
			store.RecordStageClear(s.DB, playerID, stage.ID, star)
			resp.Rewards = append(resp.Rewards,
				&common.RewardItem{ItemId: 2, Count: stage.ExpReward},
				&common.RewardItem{ItemId: 1, Count: stage.CopperReward},
			)
			// 三星首通奖励：一次性发放（铜钱翻倍 + 灵石）
			if star >= 3 && !store.HasThreeStarClaimed(s.DB, playerID, stage.ID) {
				bonusCopper := stage.CopperReward * 2
				bonusItem := int64(stage.Type * 10)
				store.AddResources(s.DB, playerID, 0, bonusCopper)
				store.AddBagItem(s.DB, playerID, 5001, bonusItem)
				store.MarkThreeStarClaimed(s.DB, playerID, stage.ID)
				resp.Rewards = append(resp.Rewards,
					&common.RewardItem{ItemId: 1, Count: bonusCopper},
					&common.RewardItem{ItemId: 5001, Count: bonusItem},
				)
			}
		}
		drops := s.rollStageDrops(stage.DropTableID, int(stage.Type), playerID)
		resp.Rewards = append(resp.Rewards, drops.Rewards...)
		resp.Equips = append(resp.Equips, drops.Equips...)
		resp.Pets = append(resp.Pets, drops.Pets...)
	}
	return respond(msgid.S2CStartStage, resp)
}

// OnSweepStage 扫荡（已通关关卡快速结算，无需回放）。
func (s *Service) OnSweepStage(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &dungeon.C2SSweepStage{}
	if err := proto.Unmarshal(body, req); err != nil {
		return respond(msgid.S2CSweepStage, &dungeon.S2CSweepStage{
			Result: &common.Result{Code: common.ErrorCode_ERR_INVALID_PARAM},
		})
	}
	stage, ok := s.Config.GetStage(req.StageId)
	if !ok {
		return respond(msgid.S2CSweepStage, &dungeon.S2CSweepStage{
			Result: &common.Result{Code: common.ErrorCode_ERR_STAGE_LOCKED},
		})
	}
	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CSweepStage, &dungeon.S2CSweepStage{
			Result: &common.Result{Code: common.ErrorCode_ERR_NOT_LOGIN},
		})
	}
	// 扫荡仅限已通关关卡（服务端权威校验）
	if !store.HasClearedStage(s.DB, p.ID, stage.ID) {
		return respond(msgid.S2CSweepStage, &dungeon.S2CSweepStage{
			Result: &common.Result{Code: common.ErrorCode_ERR_STAGE_LOCKED},
		})
	}
	// 扫荡次数：单次 1-10，默认 1
	times := req.Times
	if times <= 0 {
		times = 1
	}
	if times > 10 {
		times = 10
	}
	resp := &dungeon.S2CSweepStage{Result: okResult()}
	store.AddResources(s.DB, p.ID, stage.ExpReward*int64(times), stage.CopperReward*int64(times))
	store.AddPetExp(s.DB, p.ID, stage.ExpReward*int64(times))
	resp.Rewards = append(resp.Rewards,
		&common.RewardItem{ItemId: 2, Count: stage.ExpReward * int64(times)},
		&common.RewardItem{ItemId: 1, Count: stage.CopperReward * int64(times)},
	)
	rolls := int(stage.Type)
	if rolls < 1 {
		rolls = 1
	}
	for i := int32(0); i < times; i++ {
		d := s.rollStageDrops(stage.DropTableID, rolls, p.ID)
		resp.Rewards = append(resp.Rewards, d.Rewards...)
		resp.Equips = append(resp.Equips, d.Equips...)
		resp.Pets = append(resp.Pets, d.Pets...)
	}
	return respond(msgid.S2CSweepStage, resp)
}

// toProtoRounds 把战斗引擎的回合序列转成 proto 结构。
func toProtoRounds(rounds []combat.Round) []*dungeon.BattleRound {
	out := make([]*dungeon.BattleRound, 0, len(rounds))
	for _, r := range rounds {
		actions := make([]*dungeon.BattleAction, 0, len(r.Actions))
		for _, a := range r.Actions {
			actions = append(actions, &dungeon.BattleAction{
				AttackerUid:  a.AttackerUID,
				AttackerKind: a.AttackerKind,
				TargetUid:    a.TargetUID,
				TargetKind:   a.TargetKind,
				SkillId:      a.SkillID,
				Damage:       a.Damage,
				Heal:         a.Heal,
				IsCrit:       a.IsCrit,
				IsDodge:      a.IsDodge,
			})
		}
		out = append(out, &dungeon.BattleRound{Round: r.Round, Actions: actions})
	}
	return out
}

// calcStar 按我方存活血量占比给星：≥90% 三星，≥50% 二星，否则一星；败北零星。
func calcStar(res combat.Result) int32 {
	if !res.Win {
		return 0
	}
	if res.AttackerHPRatio >= 0.9 {
		return 3
	}
	if res.AttackerHPRatio >= 0.5 {
		return 2
	}
	return 1
}

// stageDrop 掉落结算结果（战斗与扫荡共用）。
type stageDrop struct {
	Rewards []*common.RewardItem
	Equips  []*dungeon.EquipDrop
	Pets    []*dungeon.PetDrop
}

// rollStageDrops 按掉落表权重随机 rolls 次并落库，返回三类掉落。
func (s *Service) rollStageDrops(tableID int32, rolls int, playerID int64) stageDrop {
	var out stageDrop
	if rolls < 1 {
		rolls = 1
	}
	table, ok := s.Config.GetDropTable(tableID)
	if !ok {
		return out
	}
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	for _, d := range drop.RollN(table, rolls, rng) {
		s.applyDropTo(&out, d, playerID)
	}
	return out
}

// applyDropTo 把掉落按类型归入结算：装备/灵宠落库，材料进 rewards。
func (s *Service) applyDropTo(out *stageDrop, d drop.Reward, playerID int64) {
	if eq, ok := s.Config.GetEquip(d.ItemID); ok {
		affixes := s.rollAffixes(eq.AffixPool)
		affixJSON, _ := json.Marshal(affixes)
		uid := int64(0)
		if playerID > 0 {
			if id, err := store.InsertEquip(s.DB, playerID, d.ItemID, string(affixJSON)); err == nil {
				uid = id
			}
		}
		out.Equips = append(out.Equips, &dungeon.EquipDrop{EquipUid: uid, EquipId: d.ItemID, Pos: eq.Pos, Affixes: affixes})
		return
	}
	if _, ok := s.Config.GetPet(d.ItemID); ok {
		uid := int64(0)
		if playerID > 0 {
			if id, err := store.InsertPet(s.DB, playerID, d.ItemID); err == nil {
				uid = id
			}
		}
		out.Pets = append(out.Pets, &dungeon.PetDrop{PetUid: uid, PetId: d.ItemID})
		return
	}
	// 材料：落背包 + 返回给客户端
	if playerID > 0 {
		if err := store.AddBagItem(s.DB, playerID, d.ItemID, d.Count); err != nil {
			log.Printf("[drop] 背包落库失败: %v", err)
		}
	}
	out.Rewards = append(out.Rewards, &common.RewardItem{ItemId: d.ItemID, Count: d.Count})
}

// rollAffixes 从装备词条池随机生成词条（简化：随机选 1 个词条 + 随机数值）。
func (s *Service) rollAffixes(pool []int32) []*common.EquipAffix {
	if len(pool) == 0 {
		return nil
	}
	id := pool[rand.Intn(len(pool))]
	if a, ok := s.Config.GetAffix(id); ok {
		val := a.Min
		if a.Max > a.Min {
			val += rand.Int31n(a.Max - a.Min + 1)
		}
		return []*common.EquipAffix{{AffixId: a.ID, Value: val}}
	}
	return nil
}

// ---- 以下为临时 mock 属性，接入玩家/灵宠/怪物配置表后替换 ----

func mockHero() combat.Unit {
	return combat.Unit{
		UID: 1, Kind: combat.KindRole, Name: "主角",
		MaxHP: 2000, ATK: 200, DEF: 50, Speed: 100,
		CritChance: 0.2, CritMult: 1.5, DodgeChance: 0.05,
	}
}

func mockPet(configID int32) combat.Unit {
	return combat.Unit{
		UID: int64(300000 + configID), Kind: combat.KindPet, Name: "灵宠",
		MaxHP: 800, ATK: 120, DEF: 40, Speed: 90,
		CritChance: 0.1, CritMult: 1.5, DodgeChance: 0.05,
	}
}

func mockMonster(id int32, recommendPower int64, stageType int32) combat.Unit {
	// 普通关卡：血=战力×2 攻=战力/12 防=战力/40；精英/BOSS：更肉更猛
	hp := recommendPower * 2
	atk := recommendPower / 12
	def := recommendPower / 40
	if stageType >= 2 {
		hp = recommendPower * 5 / 2
		atk = recommendPower / 10
		def = recommendPower / 35
	}
	return combat.Unit{
		UID: int64(id), Kind: combat.KindMonster, Name: "怪物",
		MaxHP: hp, ATK: atk, DEF: def, Speed: 80,
		CritChance: 0.05, CritMult: 1.5, DodgeChance: 0.02,
	}
}
