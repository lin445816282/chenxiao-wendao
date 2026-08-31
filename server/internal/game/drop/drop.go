// Package drop 提供服务端权威的掉落规则：按掉落表权重随机掉落。
package drop

import (
	"math/rand"

	"chenxiao/internal/config"
)

// Reward 掉落结果。
type Reward struct {
	ItemID int32
	Count  int64
}

// Roll 按掉落表权重随机掉落一次（权重总和>0 时必定掉落一项）。
// 权重 0 的条目永不掉落。
func Roll(table config.DropTable, rng *rand.Rand) (Reward, bool) {
	var total int64
	for _, e := range table.Entries {
		total += int64(e.Weight)
	}
	if total <= 0 {
		return Reward{}, false
	}
	n := rng.Int63n(total)
	for _, e := range table.Entries {
		n -= int64(e.Weight)
		if n < 0 {
			count := int64(e.CountMin)
			if e.CountMax > e.CountMin {
				count += rng.Int63n(int64(e.CountMax - e.CountMin + 1))
			}
			return Reward{ItemID: e.ItemID, Count: count}, true
		}
	}
	return Reward{}, false
}

// RollN 连续掉落 n 次。
func RollN(table config.DropTable, n int, rng *rand.Rand) []Reward {
	out := make([]Reward, 0, n)
	for i := 0; i < n; i++ {
		if r, ok := Roll(table, rng); ok {
			out = append(out, r)
		}
	}
	return out
}
