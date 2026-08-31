// Package game 承载业务逻辑 handler（登录/挂机/战斗/装备/灵宠/背包/邮件/排行/广告）。
package game

import (
	"chenxiao/proto/common"
	"google.golang.org/protobuf/proto"
)

// okResult 构造成功结果。
func okResult() *common.Result { return &common.Result{Code: common.ErrorCode_OK} }

// respond 序列化响应消息，返回 (respMsgID, respBody)。
func respond(msgID uint32, m proto.Message) (uint32, []byte) {
	out, err := proto.Marshal(m)
	if err != nil {
		return 0, nil
	}
	return msgID, out
}
