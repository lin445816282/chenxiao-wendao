package game

import (
	"context"

	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/bag"
	"chenxiao/proto/common"

	"google.golang.org/protobuf/proto"
)

// OnBagList 背包列表（查库）。
func (s *Service) OnBagList(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &bag.C2SBagList{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CBagList, &bag.S2CBagList{Result: okResult(), Items: []*bag.BagItem{}})
	}
	list, _ := store.ListBag(s.DB, p.ID)
	items := make([]*bag.BagItem, 0, len(list))
	for _, it := range list {
		items = append(items, &bag.BagItem{Uid: it.ID, ItemId: it.ItemID, ItemType: 1, Count: it.Count})
	}
	resp := &bag.S2CBagList{Result: okResult(), Items: items}
	return respond(msgid.S2CBagList, resp)
}

// OnBagUseItem 使用物品：材料 5001 → 铜钱 ×50。
func (s *Service) OnBagUseItem(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &bag.C2SBagUseItem{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CBagUseItem, &bag.S2CBagUseItem{Result: &common.Result{Code: common.ErrorCode_ERR_INVALID_PARAM}})
	}
	items, _ := store.ListBag(s.DB, p.ID)
	var it *store.BagItem
	for i := range items {
		if items[i].ID == req.Uid {
			it = &items[i]
			break
		}
	}
	if it == nil || req.Count <= 0 || it.Count < req.Count {
		return respond(msgid.S2CBagUseItem, &bag.S2CBagUseItem{Result: &common.Result{Code: common.ErrorCode_ERR_INVALID_PARAM}})
	}
	// 使用产出：材料 5001 → 铜钱
	var itemID int32
	var perCount int64
	switch it.ItemID {
	case 5001:
		itemID, perCount = 1, 50
	default:
		return respond(msgid.S2CBagUseItem, &bag.S2CBagUseItem{Result: &common.Result{Code: common.ErrorCode_ERR_INVALID_PARAM}})
	}
	total := perCount * req.Count
	newCount, err := store.DeductBagItem(s.DB, p.ID, it.ID, req.Count)
	if err != nil {
		return respond(msgid.S2CBagUseItem, &bag.S2CBagUseItem{Result: &common.Result{Code: common.ErrorCode_ERR_INVALID_PARAM}})
	}
	if itemID == 1 {
		store.AddResources(s.DB, p.ID, 0, total)
	}
	resp := &bag.S2CBagUseItem{
		Result:  okResult(),
		Rewards: []*common.RewardItem{{ItemId: itemID, Count: total}},
		Item:    &bag.BagItem{Uid: it.ID, ItemId: it.ItemID, ItemType: 1, Count: newCount},
	}
	return respond(msgid.S2CBagUseItem, resp)
}
