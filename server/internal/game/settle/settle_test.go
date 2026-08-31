package settle

import (
	"testing"

	"chenxiao/internal/config"
)

func testHang() config.Hang {
	return config.Hang{
		MaxOfflineSeconds: 86400,
		ExpPerSecond:      2,
		CopperPerSecond:   5,
		AdMultiplier:      2,
	}
}

func TestCapSeconds(t *testing.T) {
	h := testHang()
	if got := CapSeconds(h, 100); got != 100 {
		t.Fatalf("期望 100, 得到 %d", got)
	}
	if got := CapSeconds(h, 100000); got != 86400 {
		t.Fatalf("期望封顶 86400, 得到 %d", got)
	}
	if got := CapSeconds(h, -5); got != 0 {
		t.Fatalf("负值期望归零, 得到 %d", got)
	}
}

func TestCalcOfflineBase(t *testing.T) {
	h := testHang()
	r := CalcOffline(h, 100, 1.0, 1)
	if r.Exp != 200 {
		t.Fatalf("期望修为 200, 得到 %d", r.Exp)
	}
	if r.Copper != 500 {
		t.Fatalf("期望铜钱 500, 得到 %d", r.Copper)
	}
}

func TestCalcOfflineAdMultiplier(t *testing.T) {
	h := testHang()
	// 广告倍率 2 -> 收益翻倍
	r := CalcOffline(h, 100, 1.0, 2)
	if r.Exp != 400 || r.Copper != 1000 {
		t.Fatalf("期望修为400铜钱1000, 得到 %+v", r)
	}
}

func TestCalcOfflineStageCoeff(t *testing.T) {
	h := testHang()
	// 关卡系数 1.5
	r := CalcOffline(h, 100, 1.5, 1)
	if r.Exp != 300 || r.Copper != 750 {
		t.Fatalf("期望修为300铜钱750, 得到 %+v", r)
	}
}
