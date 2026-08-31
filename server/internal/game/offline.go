package game

import (
	"context"
	"log"
	"time"

	"chenxiao/internal/game/settle"
	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/common"
	"chenxiao/proto/offline"

	"google.golang.org/protobuf/proto"
)

// mockOfflineSeconds 临时 mock：暂无真实离线时间戳，用固定 1 小时模拟。
// 接入 t_player.last_offline_settle_at 后改为 now - last_offline_settle_at。
const mockOfflineSeconds = int64(3600)

// hangRewards 修为/铜钱 -> RewardItem（item_id：1=铜钱 2=修为）。
func hangRewards(exp, copper int64) []*common.RewardItem {
	return []*common.RewardItem{
		{ItemId: 2, Count: exp},
		{ItemId: 1, Count: copper},
	}
}

// OnOfflineRewardQuery 查询离线收益预览（服务端权威结算）。
func (s *Service) OnOfflineRewardQuery(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &offline.C2SOfflineRewardQuery{}
	_ = proto.Unmarshal(body, req)

	hang := s.Config.Hang
	seconds := settle.CapSeconds(hang, mockOfflineSeconds)
	r := settle.CalcOffline(hang, seconds, 1.0, 1) // TODO: 关卡系数/广告倍率接玩家状态

	resp := &offline.S2COfflineRewardQuery{
		Result:         okResult(),
		OfflineSeconds: seconds,
		Rewards:        hangRewards(r.Exp, r.Copper),
		HangMultiplier: 1,
	}
	return respond(msgid.S2COfflineRewardQuery, resp)
}

// OnOfflineRewardClaim 一键领取离线收益：结算并把收益落库。
func (s *Service) OnOfflineRewardClaim(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &offline.C2SOfflineRewardClaim{}
	_ = proto.Unmarshal(body, req)

	hang := s.Config.Hang
	seconds := settle.CapSeconds(hang, mockOfflineSeconds)
	r := settle.CalcOffline(hang, seconds, 1.0, 1)

	// 落库：把收益加到玩家（TODO: 按鉴权得到的账号取玩家，此处用 mock 账号）
	if p, err := store.GetPlayerByAccount(s.DB, mockAccountID); err == nil {
		if newExp, newCopper, err := store.AddResources(s.DB, p.ID, r.Exp, r.Copper); err != nil {
			log.Printf("[offline] 落库失败: %v", err)
		} else {
			log.Printf("[offline] 玩家 %d 领取收益后 exp=%d copper=%d", p.ID, newExp, newCopper)
		}
	}

	resp := &offline.S2COfflineRewardClaim{
		Result:         okResult(),
		Rewards:        hangRewards(r.Exp, r.Copper),
		SettledSeconds: seconds,
		NextSettleAt:   time.Now().Unix(),
	}
	return respond(msgid.S2COfflineRewardClaim, resp)
}

// OnHangRewardQuery 在线挂机收益查询：按 last_hang_settle_at 累积。
func (s *Service) OnHangRewardQuery(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &offline.C2SHangRewardQuery{}
	_ = proto.Unmarshal(body, req)

	hang := s.Config.Hang
	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CHangRewardQuery, &offline.S2CHangRewardQuery{Result: okResult()})
	}
	now := time.Now().Unix()
	last := p.LastHangSettleAt
	if last == 0 {
		last = now
	}
	elapsed := now - last
	if elapsed < 0 {
		elapsed = 0
	}
	resp := &offline.S2CHangRewardQuery{
		Result:  okResult(),
		Rewards: hangRewards(elapsed*hang.ExpPerSecond, elapsed*hang.CopperPerSecond),
	}
	return respond(msgid.S2CHangRewardQuery, resp)
}

// OnHangRewardClaim 在线挂机收益领取：结算落库并刷新结算基准。
func (s *Service) OnHangRewardClaim(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &offline.C2SHangRewardClaim{}
	_ = proto.Unmarshal(body, req)

	hang := s.Config.Hang
	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CHangRewardClaim, &offline.S2CHangRewardClaim{Result: okResult()})
	}
	now := time.Now().Unix()
	last := p.LastHangSettleAt
	if last == 0 {
		last = now
	}
	elapsed := now - last
	if elapsed < 0 {
		elapsed = 0
	}
	exp := elapsed * hang.ExpPerSecond
	copper := elapsed * hang.CopperPerSecond
	if exp > 0 || copper > 0 {
		store.AddResources(s.DB, p.ID, exp, copper)
	}
	store.UpdateLastHangSettleAt(s.DB, p.ID, now)
	resp := &offline.S2CHangRewardClaim{Result: okResult(), Rewards: hangRewards(exp, copper)}
	return respond(msgid.S2CHangRewardClaim, resp)
}
