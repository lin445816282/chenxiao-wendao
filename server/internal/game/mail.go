package game

import (
	"context"

	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/common"
	"chenxiao/proto/mail"

	"google.golang.org/protobuf/proto"
)

// OnMailList 邮件列表（查库）。
func (s *Service) OnMailList(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &mail.C2SMailList{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CMailList, &mail.S2CMailList{Result: okResult(), Mails: []*mail.MailInfo{}})
	}
	list, _ := store.ListMail(s.DB, p.ID)
	mails := make([]*mail.MailInfo, 0, len(list))
	for _, m := range list {
		mi := &mail.MailInfo{
			MailId: m.ID, MailType: m.MailType, Title: m.Title, Content: m.Content,
			IsRead: m.IsRead, IsClaimed: m.IsClaimed,
		}
		if m.AttachItemID > 0 {
			mi.Attachments = []*mail.MailAttachment{{ItemId: m.AttachItemID, Count: m.AttachCount}}
		}
		mails = append(mails, mi)
	}
	resp := &mail.S2CMailList{Result: okResult(), Mails: mails}
	return respond(msgid.S2CMailList, resp)
}

// OnMailRead 标记已读。
func (s *Service) OnMailRead(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &mail.C2SMailRead{}
	_ = proto.Unmarshal(body, req)
	_ = store.MarkRead(s.DB, req.MailId)
	resp := &mail.S2CMailRead{Result: okResult(), MailId: req.MailId}
	return respond(msgid.S2CMailRead, resp)
}

// OnMailClaim 领取附件：附件进背包，标记已领。
func (s *Service) OnMailClaim(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &mail.C2SMailClaim{}
	_ = proto.Unmarshal(body, req)

	p, err := store.GetPlayerByAccount(s.DB, mockAccountID)
	if err != nil {
		return respond(msgid.S2CMailClaim, &mail.S2CMailClaim{Result: &common.Result{Code: common.ErrorCode_ERR_MAIL_NOT_FOUND}})
	}
	m, err := store.GetMail(s.DB, req.MailId)
	if err != nil || m.PlayerID != p.ID {
		return respond(msgid.S2CMailClaim, &mail.S2CMailClaim{Result: &common.Result{Code: common.ErrorCode_ERR_MAIL_NOT_FOUND}})
	}
	if m.IsClaimed {
		return respond(msgid.S2CMailClaim, &mail.S2CMailClaim{Result: &common.Result{Code: common.ErrorCode_ERR_MAIL_ALREADY_CLAIMED}})
	}

	itemID, count, err := store.ClaimMail(s.DB, m.ID)
	if err != nil {
		return respond(msgid.S2CMailClaim, &mail.S2CMailClaim{Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL}})
	}
	if itemID > 0 {
		_ = store.AddBagItem(s.DB, p.ID, itemID, count)
	}
	resp := &mail.S2CMailClaim{
		Result:  okResult(),
		MailId:  m.ID,
		Rewards: []*common.RewardItem{{ItemId: itemID, Count: count}},
	}
	return respond(msgid.S2CMailClaim, resp)
}
