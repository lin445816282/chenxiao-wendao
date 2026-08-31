package game

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/ad"
	"chenxiao/proto/common"

	"google.golang.org/protobuf/proto"
)

// adBizMap 幂等记录：biz_id -> 是否已发奖（进程内；生产换 t_ad_log + 微信服务端校验）。
var (
	adBizMu  sync.Mutex
	adBizMap = make(map[string]bool)
)

// OnAdRequest 请求观看广告：生成 biz_id（幂等键）。
func (s *Service) OnAdRequest(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &ad.C2SAdRequest{}
	_ = proto.Unmarshal(body, req)

	bizID := fmt.Sprintf("ad_%d_%d", time.Now().UnixNano(), rand.Int63n(1<<30))
	adBizMu.Lock()
	adBizMap[bizID] = false
	adBizMu.Unlock()

	resp := &ad.S2CAdRequest{Result: okResult(), BizId: bizID, RemainTimes: 10}
	return respond(msgid.S2CAdRequest, resp)
}

// OnAdReport 观看完成上报：幂等发奖（铜钱 500）。生产环境应接微信服务端校验。
func (s *Service) OnAdReport(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &ad.C2SAdReport{}
	_ = proto.Unmarshal(body, req)

	adBizMu.Lock()
	done := adBizMap[req.BizId]
	adBizMap[req.BizId] = true
	adBizMu.Unlock()
	if done {
		return respond(msgid.S2CAdReport, &ad.S2CAdReport{Result: &common.Result{Code: common.ErrorCode_ERR_AD_DUPLICATE}})
	}
	if p, err := store.GetPlayerByAccount(s.DB, mockAccountID); err == nil {
		store.AddResources(s.DB, p.ID, 0, 500)
	}
	resp := &ad.S2CAdReport{
		Result:  okResult(),
		Rewards: []*common.RewardItem{{ItemId: 1, Count: 500}},
	}
	return respond(msgid.S2CAdReport, resp)
}
