package drop

import (
	"math/rand"
	"testing"

	"chenxiao/internal/config"
)

func TestRollSingleEntry(t *testing.T) {
	table := config.DropTable{ID: 1, Entries: []config.DropEntry{
		{ItemID: 2001, Weight: 100, CountMin: 1, CountMax: 1},
	}}
	r, ok := Roll(table, rand.New(rand.NewSource(1)))
	if !ok || r.ItemID != 2001 || r.Count != 1 {
		t.Fatalf("期望掉 2001x1, 得到 %+v ok=%v", r, ok)
	}
}

func TestRollZeroWeightNeverDrops(t *testing.T) {
	table := config.DropTable{ID: 1, Entries: []config.DropEntry{
		{ItemID: 2001, Weight: 100, CountMin: 1, CountMax: 1},
		{ItemID: 5001, Weight: 0, CountMin: 1, CountMax: 1}, // 权重 0
	}}
	rng := rand.New(rand.NewSource(1))
	for i := 0; i < 100; i++ {
		r, ok := Roll(table, rng)
		if !ok {
			t.Fatal("应掉落")
		}
		if r.ItemID != 2001 {
			t.Fatalf("权重 0 的条目不应掉落, 得到 %d", r.ItemID)
		}
	}
}

func TestRollEmptyTable(t *testing.T) {
	table := config.DropTable{ID: 1}
	if _, ok := Roll(table, rand.New(rand.NewSource(1))); ok {
		t.Fatal("空表不应掉落")
	}
}

func TestRollCountRange(t *testing.T) {
	table := config.DropTable{ID: 1, Entries: []config.DropEntry{
		{ItemID: 5001, Weight: 100, CountMin: 2, CountMax: 5},
	}}
	rng := rand.New(rand.NewSource(1))
	for i := 0; i < 50; i++ {
		r, _ := Roll(table, rng)
		if r.Count < 2 || r.Count > 5 {
			t.Fatalf("数量应在 [2,5], 得到 %d", r.Count)
		}
	}
}
