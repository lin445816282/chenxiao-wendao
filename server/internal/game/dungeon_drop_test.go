package game

import (
	"context"
	"testing"

	"chenxiao/internal/config"
	"chenxiao/internal/store"
	"chenxiao/proto/dungeon"
	"google.golang.org/protobuf/proto"
)

func TestStartStageDrop(t *testing.T) {
	cfg, err := config.Load("../../configs")
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	db, err := store.OpenSQLite(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := store.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	// 创建玩家，使战斗胜利能下发基础奖励（修为/铜钱）
	if _, err := store.CreatePlayer(db, mockAccountID, "测试"); err != nil {
		t.Fatalf("create player: %v", err)
	}
	svc := NewService(cfg, db, nil, nil)

	for _, tc := range []struct{ id, typ int32 }{{1001, 1}, {1002, 1}, {2001, 2}} {
		req, _ := proto.Marshal(&dungeon.C2SStartStage{StageId: tc.id, StageType: tc.typ})
		_, body := svc.OnStartStage(context.Background(), nil, req)
		resp := &dungeon.S2CStartStage{}
		if err := proto.Unmarshal(body, resp); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		t.Logf("stage %d: win=%v star=%d rounds=%d rewards=%d equips=%d pets=%d",
			tc.id, resp.Win, resp.Star, len(resp.Rounds), len(resp.Rewards), len(resp.Equips), len(resp.Pets))
		if resp.Win {
			var hasExp, hasCopper bool
			for _, r := range resp.Rewards {
				if r.ItemId == 2 && r.Count > 0 {
					hasExp = true
				}
				if r.ItemId == 1 && r.Count > 0 {
					hasCopper = true
				}
			}
			if !hasExp || !hasCopper {
				t.Errorf("stage %d win=true but missing exp/copper reward (hasExp=%v hasCopper=%v)", tc.id, hasExp, hasCopper)
			}
		}
	}
}
