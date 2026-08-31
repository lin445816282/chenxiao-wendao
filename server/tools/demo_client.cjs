#!/usr/bin/env node
'use strict';
// 全量演示客户端：连网关，顺序发送全部已注册 C2S 消息，校验每个 S2C 回包。
// 用法：node demo_client.cjs [ws://127.0.0.1:8080/ws]

const URL = process.argv[2] || 'ws://127.0.0.1:8080/ws';

// [名称, C2S msgId, 期望 S2C msgId]
const CASES = [
  ['登录', 1000, 1001],
  ['创建角色', 1002, 1003],
  ['离线收益查询', 2000, 2001],
  ['离线收益领取', 2002, 2003],
  ['在线挂机查询', 2004, 2005],
  ['开始战斗', 3000, 3001],
  ['扫荡', 3002, 3003],
  ['装备列表', 4000, 4001],
  ['穿戴装备', 4002, 4003],
  ['灵宠列表', 5000, 5001],
  ['灵宠出战', 5002, 5003],
  ['背包列表', 6000, 6001],
  ['邮件列表', 7000, 7001],
  ['排行榜查询', 8000, 8001],
  ['广告请求', 9000, 9001],
  ['广告上报', 9002, 9003],
];

function encode(msgId, body) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(msgId, 0);
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ws = new WebSocket(URL);
ws.binaryType = 'arraybuffer';

let pending = null;
let pass = 0;
let fail = 0;

ws.onmessage = (ev) => {
  const buf = Buffer.from(ev.data);
  const msgId = buf.readUInt32BE(0);
  const len = buf.readUInt32BE(4);
  if (pending) {
    pending.resolve({ msgId, len, body: buf.slice(8, 8 + len) });
    pending = null;
  }
};

function send(msgId) {
  return new Promise((resolve) => {
    pending = { resolve };
    ws.send(encode(msgId, Buffer.alloc(0)));
  });
}

ws.onopen = async () => {
  console.log('已连接 ' + URL + '\n');
  for (const [name, c2s, s2c] of CASES) {
    const resp = await send(c2s);
    const ok = resp.msgId === s2c;
    ok ? pass++ : fail++;
    console.log(
      `${ok ? '✅' : '❌'} ${name.padEnd(8, '　')} C2S=${c2s} -> S2C=${resp.msgId} (期望${s2c}) len=${resp.len}`
    );
    await sleep(150);
  }
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  ws.close();
  process.exit(fail === 0 ? 0 : 1);
};

ws.onerror = (e) => {
  console.error('WebSocket 错误:', e.message || e);
  process.exit(1);
};

setTimeout(() => {
  console.error('超时');
  process.exit(1);
}, 30000);
