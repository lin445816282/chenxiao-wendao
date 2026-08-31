// Package net 提供网关层：消息编解码、连接封装与 WebSocket 服务。
package net

import (
	"encoding/binary"
	"errors"
)

// HeaderSize 包头长度：4 字节 msgId + 4 字节 body 长度（大端）
const HeaderSize = 8

var (
	ErrPacketTooShort  = errors.New("packet too short")
	ErrBodyLenMismatch = errors.New("body length mismatch")
)

// Encode 将 msgId 与 protobuf body 编码为一个完整包。
//
// 帧格式：
//
//	+----------------+----------------+--------------+
//	| msgId (uint32) | bodyLen(uint32)| body (bodyLen) |
//	+----------------+----------------+--------------+
func Encode(msgID uint32, body []byte) []byte {
	buf := make([]byte, HeaderSize+len(body))
	binary.BigEndian.PutUint32(buf[0:4], msgID)
	binary.BigEndian.PutUint32(buf[4:8], uint32(len(body)))
	copy(buf[HeaderSize:], body)
	return buf
}

// Decode 解析一个完整包，返回 msgId 与 body（不含包头）。
func Decode(packet []byte) (uint32, []byte, error) {
	if len(packet) < HeaderSize {
		return 0, nil, ErrPacketTooShort
	}
	msgID := binary.BigEndian.Uint32(packet[0:4])
	bodyLen := binary.BigEndian.Uint32(packet[4:8])
	if uint32(len(packet)-HeaderSize) != bodyLen {
		return 0, nil, ErrBodyLenMismatch
	}
	return msgID, packet[HeaderSize:], nil
}
