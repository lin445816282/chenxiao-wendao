package net

import (
	"errors"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Connection 封装单条 WebSocket 连接：读由 WSServer 驱动，写走独立协程与发送队列。
type Connection struct {
	conn   *websocket.Conn
	mu     sync.Mutex
	sendCh chan []byte
	done   chan struct{}
	closed bool

	// 会话信息（登录成功后填充）
	AccountID int64
	PlayerID  int64
	Token     string
}

func NewConnection(conn *websocket.Conn) *Connection {
	return &Connection{
		conn:   conn,
		sendCh: make(chan []byte, 64),
		done:   make(chan struct{}),
	}
}

// Send 编码并投递消息到发送队列（非阻塞，队列满返回错误）。
func (c *Connection) Send(msgID uint32, body []byte) error {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return errors.New("connection closed")
	}
	c.mu.Unlock()

	select {
	case c.sendCh <- Encode(msgID, body):
		return nil
	case <-c.done:
		return errors.New("connection closed")
	default:
		return errors.New("send queue full")
	}
}

// writeLoop 发送协程，由 WSServer 在连接建立后启动。
func (c *Connection) writeLoop() {
	defer c.Close()
	for {
		select {
		case pkt := <-c.sendCh:
			_ = c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := c.conn.WriteMessage(websocket.BinaryMessage, pkt); err != nil {
				return
			}
		case <-c.done:
			return
		}
	}
}

// Close 幂等地关闭连接。
func (c *Connection) Close() {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return
	}
	c.closed = true
	close(c.done)
	c.mu.Unlock()
	_ = c.conn.Close()
}
