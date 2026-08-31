#!/usr/bin/env node
'use strict';
// WebSocket 冒烟测试：连网关 -> 发 C2SLogin(msgId=1000, 空 body) -> 收 S2CLogin 校验
// 用法：node smoke_client.cjs [ws://127.0.0.1:8080/ws]

const URL = process.argv[2] || 'ws://127.0.0.1:8080/ws';

function encode(msgId, body) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(msgId, 0);
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
}

const ws = new WebSocket(URL);
ws.binaryType = 'arraybuffer';

const timer = setTimeout(() => {
  console.error('超时未收到响应');
  process.exit(1);
}, 5000);

ws.onopen = () => {
  console.log('已连接:', URL);
  // C2SLogin：空 body（code/device_info 均空，合法 protobuf）
  ws.send(encode(1000, Buffer.alloc(0)));
  console.log('已发送 C2SLogin (msgId=1000)');
};

ws.onmessage = (ev) => {
  const buf = Buffer.from(ev.data);
  const msgId = buf.readUInt32BE(0);
  const len = buf.readUInt32BE(4);
  const payload = buf.slice(8, 8 + len);
  console.log('收到响应: msgId=' + msgId + ' len=' + len);
  console.log('payload(hex):', payload.toString('hex'));
  console.log('payload(utf8):', payload.toString('utf8'));

  const ok = msgId === 1001 && payload.toString('utf8').includes('mock-token');
  console.log(ok ? '\n✅ 冒烟测试通过：登录请求 -> S2CLogin(含 token)' : '\n⚠️ 响应与预期不符');
  clearTimeout(timer);
  ws.close();
  process.exit(ok ? 0 : 1);
};

ws.onerror = (e) => {
  console.error('WebSocket 错误:', e.message || e);
  clearTimeout(timer);
  process.exit(1);
};
