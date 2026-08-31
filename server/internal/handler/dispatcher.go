// Package handler 提供消息路由分发与业务 handler 注册。
package handler

import (
	"context"
	"log"

	"chenxiao/internal/net"
)

// Handler 业务处理函数：解析 body（protobuf），返回响应消息。
// 常见模式为「请求 -> 响应」；需要主动推送时可在 handler 内直接 conn.Send。
type Handler func(ctx context.Context, conn *net.Connection, body []byte) (respMsgID uint32, respBody []byte)

// Dispatcher 按 msgId 路由到对应 handler。
type Dispatcher struct {
	handlers map[uint32]Handler
}

func NewDispatcher() *Dispatcher {
	return &Dispatcher{handlers: make(map[uint32]Handler)}
}

// Register 注册一个消息处理函数。
func (d *Dispatcher) Register(msgID uint32, h Handler) {
	d.handlers[msgID] = h
}

// Dispatch 处理一条消息；未知消息或 handler 返回空响应时静默忽略。
func (d *Dispatcher) Dispatch(conn *net.Connection, msgID uint32, body []byte) {
	h, ok := d.handlers[msgID]
	if !ok {
		log.Printf("[dispatch] 未注册消息 msgId=%d", msgID)
		return
	}
	log.Printf("[dispatch] 收到 msgId=%d bodyLen=%d", msgID, len(body))
	respMsgID, respBody := h(context.Background(), conn, body)
	if respMsgID != 0 && respBody != nil {
		_ = conn.Send(respMsgID, respBody)
		log.Printf("[dispatch] 响应 msgId=%d", respMsgID)
	}
}
