package game

import (
	"context"
	"strconv"

	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/rank"

	"github.com/redis/go-redis/v9"
	"google.golang.org/protobuf/proto"
)

const rankKeyPower = "rank:power"

// updateRank 更新玩家战力榜（Redis ZSet）。
func (s *Service) updateRank(playerID, power int64) {
	if s.Redis == nil {
		return
	}
	_ = s.Redis.Client.ZAdd(context.Background(), rankKeyPower,
		redis.Z{Score: float64(power), Member: strconv.FormatInt(playerID, 10)}).Err()
}

// OnRankQuery 查询排行榜（Redis ZSet，按战力倒序）。
func (s *Service) OnRankQuery(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &rank.C2SRankQuery{}
	_ = proto.Unmarshal(body, req)

	resp := &rank.S2CRankQuery{Result: okResult(), Entries: []*rank.RankEntry{}}
	if s.Redis == nil {
		return respond(msgid.S2CRankQuery, resp)
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	start := int64(req.Page) * int64(req.PageSize)
	stop := start + int64(req.PageSize) - 1

	zs, err := s.Redis.Client.ZRevRangeWithScores(ctx, rankKeyPower, start, stop).Result()
	if err != nil {
		return respond(msgid.S2CRankQuery, resp)
	}
	entries := make([]*rank.RankEntry, 0, len(zs))
	for i, z := range zs {
		pid, _ := strconv.ParseInt(z.Member.(string), 10, 64)
		e := &rank.RankEntry{RankNo: int32(start) + int32(i) + 1, PlayerId: pid, Score: int64(z.Score)}
		if p, err := store.GetPlayerByID(s.DB, pid); err == nil {
			e.Nickname = p.Nickname
			e.Level = p.Level
		}
		entries = append(entries, e)
	}
	resp.Entries = entries

	// 我的名次
	if p, err := store.GetPlayerByAccount(s.DB, mockAccountID); err == nil {
		if rk, err := s.Redis.Client.ZRevRank(ctx, rankKeyPower, strconv.FormatInt(p.ID, 10)).Result(); err == nil {
			resp.MyRank = &rank.RankEntry{
				RankNo: int32(rk) + 1, PlayerId: p.ID, Nickname: p.Nickname, Level: p.Level, Score: s.teamPower(p.ID),
			}
		}
	}
	return respond(msgid.S2CRankQuery, resp)
}
