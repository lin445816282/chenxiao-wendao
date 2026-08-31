package net

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	// TODO(M2): 生产环境校验来源，防止跨域滥用（微信小游戏域名固定，可做白名单）
	CheckOrigin: func(r *http.Request) bool { return true },
}

// MessageHandler 收到一条消息时回调（由上层 handler.Dispatcher 注入）。
type MessageHandler func(conn *Connection, msgID uint32, body []byte)

// CloseHandler 连接关闭时回调（用于清理玩家在线态等）。
type CloseHandler func(conn *Connection)

// WSServer 实现 http.Handler，负责 WebSocket 升级与读写循环。
type WSServer struct {
	onMessage MessageHandler
	onClose   CloseHandler
}

func NewWSServer(onMessage MessageHandler, onClose CloseHandler) *WSServer {
	return &WSServer{onMessage: onMessage, onClose: onClose}
}

func (s *WSServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 非 WebSocket 请求（如浏览器直接访问）返回友好说明页
	if !websocket.IsWebSocketUpgrade(r) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUpgradeRequired)
		_, _ = w.Write([]byte(`<!doctype html><html lang="zh-CN"><body style="font-family:sans-serif;padding:24px">
<h2>游戏服务器 WebSocket 端点</h2>
<p>此地址只接受 WebSocket 连接，请在客户端用 <code>wss://game.ct256.cn/ws</code> 连接（微信小游戏用 wx.connectSocket）。</p>
<p>健康检查：<a href="/healthz">/healthz</a></p>
</body></html>`))
		return
	}

	wsConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	log.Printf("[ws] 新连接 %s", r.RemoteAddr)
	conn := NewConnection(wsConn)
	go conn.writeLoop()
	if s.onClose != nil {
		defer s.onClose(conn)
	}
	s.readLoop(conn)
}

func (s *WSServer) readLoop(conn *Connection) {
	defer conn.Close()
	conn.conn.SetReadLimit(1 << 20) // 单包上限 1MB
	for {
		_, data, err := conn.conn.ReadMessage()
		if err != nil {
			return
		}
		msgID, body, err := Decode(data)
		if err != nil {
			continue
		}
		if s.onMessage != nil {
			s.onMessage(conn, msgID, body)
		}
	}
}
