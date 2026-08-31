package game

import (
	"context"
	"database/sql"
	"log"
	"time"

	"chenxiao/internal/msgid"
	"chenxiao/internal/net"
	"chenxiao/internal/store"
	"chenxiao/proto/common"
	"chenxiao/proto/login"

	"google.golang.org/protobuf/proto"
)

// mockAccountID 未配置微信登录时使用的固定账号。
const mockAccountID = int64(1)

// resolveAccount 解析登录账号：微信登录用 code 换 openid -> account_id；未配置则用 mock 账号。
// 返回 (accountID, 错误响应)；错误响应为 nil 表示成功。
func (s *Service) resolveAccount(code string) (int64, *login.S2CLogin) {
	if s.WeChat.Enabled() && code != "" {
		openid, _, err := s.WeChat.Code2Session(code)
		if err != nil {
			log.Printf("[login] code2session 失败: %v", err)
			return 0, &login.S2CLogin{Result: &common.Result{Code: common.ErrorCode_ERR_LOGIN_CODE_INVALID}}
		}
		id, err := store.GetOrCreateAccount(s.DB, openid)
		if err != nil {
			return 0, &login.S2CLogin{Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL}}
		}
		return id, nil
	}
	return mockAccountID, nil
}

// OnLogin 登录：查/建角色，返回角色快照（数据落库，重启不丢）。
func (s *Service) OnLogin(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &login.C2SLogin{}
	_ = proto.Unmarshal(body, req)

	accountID, errResp := s.resolveAccount(req.Code)
	if errResp != nil {
		return respond(msgid.S2CLogin, errResp)
	}
	conn.AccountID = accountID

	p, err := store.GetPlayerByAccount(s.DB, accountID)
	resp := &login.S2CLogin{Result: okResult(), Token: "mock-token"}
	if err == sql.ErrNoRows {
		resp.HasRole = false
		return respond(msgid.S2CLogin, resp)
	}
	if err != nil {
		return respond(msgid.S2CLogin, &login.S2CLogin{
			Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL},
		})
	}
	conn.PlayerID = p.ID
	resp.HasRole = true
	resp.Role = s.roleBrief(p)
	// 每日签到：登录自动发放签到邮件（材料礼包）
	day := time.Now().Format("2006-01-02")
	if p.LastSignDay != day {
		store.InsertMail(s.DB, p.ID, 1, "每日签到奖励", "感谢登录，附赠签到材料礼包！", 5001, 20)
		store.UpdateLastSignDay(s.DB, p.ID, day)
	}
	s.updateRank(p.ID, s.teamPower(p.ID))
	return respond(msgid.S2CLogin, resp)
}

// OnCreateRole 创建角色（落库）。
func (s *Service) OnCreateRole(ctx context.Context, conn *net.Connection, body []byte) (uint32, []byte) {
	req := &login.C2SCreateRole{}
	if err := proto.Unmarshal(body, req); err != nil {
		return respond(msgid.S2CCreateRole, &login.S2CCreateRole{
			Result: &common.Result{Code: common.ErrorCode_ERR_INVALID_PARAM},
		})
	}
	// TODO(M2): 校验昵称（长度/敏感词）
	accountID := conn.AccountID
	if accountID == 0 {
		accountID = mockAccountID
	}
	id, err := store.CreatePlayer(s.DB, accountID, req.Nickname)
	if err != nil {
		return respond(msgid.S2CCreateRole, &login.S2CCreateRole{
			Result: &common.Result{Code: common.ErrorCode_ERR_INTERNAL},
		})
	}
	conn.PlayerID = id
	p := &store.Player{ID: id, AccountID: accountID, Nickname: req.Nickname, Level: 1}
	s.updateRank(id, s.teamPower(id))

	// 欢迎邮件（附新手材料礼包）
	_, _ = store.InsertMail(s.DB, id, 1, "欢迎加入尘霄问道", "感谢创建角色，附赠新手材料礼包！", 5001, 10)

	resp := &login.S2CCreateRole{Result: okResult(), Role: s.roleBrief(p)}
	return respond(msgid.S2CCreateRole, resp)
}

// roleBrief 组装角色快照（战力按真实属性装配计算）。
func (s *Service) roleBrief(p *store.Player) *login.RoleBrief {
	return &login.RoleBrief{
		PlayerId: p.ID,
		Nickname: p.Nickname,
		Level:    p.Level,
		Exp:      p.Exp,
		Copper:   p.Copper,
		Power:    s.teamPower(p.ID),
	}
}
