// Package combat 提供服务端权威的自动战斗结算引擎。
// 客户端不参与任何数值计算，只按返回的回合序列回放表现动画/飘字。
package combat

import (
	"math/rand"
	"sort"
)

// 单位类型（与 proto CombatUnit.Kind 对齐）
const (
	KindRole    = 1
	KindPet     = 2
	KindMonster = 3
)

// 阵营
const (
	SideAttacker = 1
	SideDefender = 2
)

// Unit 战斗单位（由配置表与玩家存档装配后传入）。
type Unit struct {
	UID         int64
	Kind        int32
	Name        string
	Side        int32
	MaxHP       int64
	HP          int64
	ATK         int64
	DEF         int64
	Speed       int32
	CritChance  float64 // 暴击概率 0~1
	CritMult    float64 // 暴击倍率，如 1.5
	DodgeChance float64 // 闪避概率 0~1
}

// Action 一次行动（对应 proto dungeon.BattleAction）。
type Action struct {
	AttackerUID  int64
	AttackerKind int32
	TargetUID    int64
	TargetKind   int32
	SkillID      int32 // 0=普攻
	Damage       int64
	Heal         int64
	IsCrit       bool
	IsDodge      bool
}

// Round 一个回合（双方各存活单位按速度依次行动一次）。
type Round struct {
	Round   int32
	Actions []Action
}

// Result 战斗结果。
type Result struct {
	Win             bool
	Rounds          []Round
	AttackerAlive   int     // 我方存活数
	DefenderAlive   int     // 敌方存活数
	AttackerHPRatio float64 // 我方存活单位血量占比 0~1（用于星级判定）
}

// Simulate 跑完整场战斗，直到一方全灭或达到 maxRounds。
// 传入的 attackers/defenders 会被复制，不影响调用方。
func Simulate(attackers, defenders []Unit, maxRounds int32, rng *rand.Rand) Result {
	units := make([]*Unit, 0, len(attackers)+len(defenders))
	for i := range attackers {
		u := attackers[i]
		u.HP = u.MaxHP
		u.Side = SideAttacker
		units = append(units, &u)
	}
	for i := range defenders {
		u := defenders[i]
		u.HP = u.MaxHP
		u.Side = SideDefender
		units = append(units, &u)
	}

	res := Result{}
	for round := int32(1); round <= maxRounds; round++ {
		aliveA, aliveD := countAlive(units)
		if aliveA == 0 || aliveD == 0 {
			break
		}
		order := aliveUnitsBySpeed(units)
		roundActions := make([]Action, 0, len(order))
		for _, u := range order {
			if u.HP <= 0 {
				continue
			}
			target := pickTarget(u, units)
			if target == nil {
				continue
			}
			roundActions = append(roundActions, performAttack(u, target, rng))
		}
		if len(roundActions) > 0 {
			res.Rounds = append(res.Rounds, Round{Round: round, Actions: roundActions})
		}
	}

	res.AttackerAlive, res.DefenderAlive = countAlive(units)
	res.AttackerHPRatio = hpRatio(units, SideAttacker)
	res.Win = res.DefenderAlive == 0 && res.AttackerAlive > 0
	return res
}

// countAlive 返回 (我方存活, 敌方存活)。
func countAlive(units []*Unit) (attacker, defender int) {
	for _, u := range units {
		if u.HP > 0 {
			if u.Side == SideAttacker {
				attacker++
			} else {
				defender++
			}
		}
	}
	return
}

// hpRatio 返回某方存活单位血量占总血量的比例。
func hpRatio(units []*Unit, side int32) float64 {
	var total, max float64
	for _, u := range units {
		if u.Side == side {
			max += float64(u.MaxHP)
			if u.HP > 0 {
				total += float64(u.HP)
			}
		}
	}
	if max <= 0 {
		return 0
	}
	return total / max
}

// aliveUnitsBySpeed 存活单位按速度降序（速度高先行动）。
func aliveUnitsBySpeed(units []*Unit) []*Unit {
	alive := make([]*Unit, 0, len(units))
	for _, u := range units {
		if u.HP > 0 {
			alive = append(alive, u)
		}
	}
	sort.SliceStable(alive, func(i, j int) bool {
		return alive[i].Speed > alive[j].Speed
	})
	return alive
}

// pickTarget 选取敌方存活目标，优先血量最低（简单挂机策略）。
func pickTarget(u *Unit, units []*Unit) *Unit {
	var candidates []*Unit
	for _, t := range units {
		if t.HP > 0 && t.Side != u.Side {
			candidates = append(candidates, t)
		}
	}
	if len(candidates) == 0 {
		return nil
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		return candidates[i].HP < candidates[j].HP
	})
	return candidates[0]
}

// performAttack 执行一次普攻并返回行动记录。
// 伤害 = max(1, 攻击 - 防御)，暴击按倍率放大，闪避则不造成伤害。
func performAttack(u, target *Unit, rng *rand.Rand) Action {
	action := Action{
		AttackerUID:  u.UID,
		AttackerKind: u.Kind,
		TargetUID:    target.UID,
		TargetKind:   target.Kind,
		SkillID:      0,
	}

	if rng.Float64() < target.DodgeChance {
		action.IsDodge = true
		return action
	}

	damage := u.ATK - target.DEF
	if damage < 1 {
		damage = 1
	}
	if rng.Float64() < u.CritChance {
		damage = int64(float64(damage) * u.CritMult)
		if damage < 1 {
			damage = 1
		}
		action.IsCrit = true
	}
	target.HP -= damage
	if target.HP < 0 {
		target.HP = 0
	}
	action.Damage = damage
	return action
}
