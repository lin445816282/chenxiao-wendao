package combat

import (
	"math/rand"
	"testing"
)

func TestSimulateAttackerWins(t *testing.T) {
	hero := Unit{UID: 1, Kind: KindRole, Name: "主角", MaxHP: 1000, ATK: 200, DEF: 50, Speed: 100}
	monster := Unit{UID: 101, Kind: KindMonster, Name: "小妖", MaxHP: 500, ATK: 100, DEF: 20, Speed: 80}

	res := Simulate([]Unit{hero}, []Unit{monster}, 50, rand.New(rand.NewSource(1)))
	if !res.Win {
		t.Fatalf("期望我方获胜, 结果 Win=%v aliveA=%d aliveD=%d", res.Win, res.AttackerAlive, res.DefenderAlive)
	}
	if res.AttackerAlive != 1 || res.DefenderAlive != 0 {
		t.Fatalf("期望我方1存活敌方0, 实际 aliveA=%d aliveD=%d", res.AttackerAlive, res.DefenderAlive)
	}
	if len(res.Rounds) == 0 {
		t.Fatal("期望有回合记录")
	}
	for _, r := range res.Rounds {
		for _, a := range r.Actions {
			if a.Damage <= 0 && !a.IsDodge {
				t.Fatalf("行动应造成伤害或闪避, got %+v", a)
			}
		}
	}
}

func TestDamageFormula(t *testing.T) {
	// 攻击 100，防御 30 -> 基础伤害 70（无暴击、无闪避）
	u := &Unit{ATK: 100, CritChance: 0}
	tgt := &Unit{HP: 1000, DEF: 30, DodgeChance: 0}
	a := performAttack(u, tgt, rand.New(rand.NewSource(1)))
	if a.Damage != 70 {
		t.Fatalf("期望伤害 70, 得到 %d", a.Damage)
	}
	if a.IsCrit || a.IsDodge {
		t.Fatal("不应暴击/闪避")
	}
	if tgt.HP != 930 {
		t.Fatalf("目标血量应为 930, 得到 %d", tgt.HP)
	}
}

func TestDamageFloor(t *testing.T) {
	// 防御高于攻击时，伤害保底为 1
	u := &Unit{ATK: 10, CritChance: 0}
	tgt := &Unit{HP: 100, DEF: 9999, DodgeChance: 0}
	a := performAttack(u, tgt, rand.New(rand.NewSource(1)))
	if a.Damage != 1 {
		t.Fatalf("期望保底伤害 1, 得到 %d", a.Damage)
	}
}

func TestDodge(t *testing.T) {
	u := &Unit{ATK: 100, CritChance: 0}
	tgt := &Unit{HP: 1000, DEF: 0, DodgeChance: 1.0} // 100% 闪避
	a := performAttack(u, tgt, rand.New(rand.NewSource(1)))
	if !a.IsDodge {
		t.Fatal("期望闪避")
	}
	if tgt.HP != 1000 {
		t.Fatal("闪避不应掉血")
	}
}

func TestDefenderWins(t *testing.T) {
	// 弱英雄 vs 强怪 -> 我方落败
	weak := Unit{UID: 1, Kind: KindRole, Name: "主角", MaxHP: 100, ATK: 10, DEF: 5, Speed: 100}
	strong := Unit{UID: 301, Kind: KindMonster, Name: "BOSS", MaxHP: 10000, ATK: 500, DEF: 100, Speed: 120}
	res := Simulate([]Unit{weak}, []Unit{strong}, 50, rand.New(rand.NewSource(2)))
	if res.Win {
		t.Fatal("期望我方落败")
	}
	if res.AttackerAlive != 0 {
		t.Fatalf("期望我方全灭, 实际存活 %d", res.AttackerAlive)
	}
}
