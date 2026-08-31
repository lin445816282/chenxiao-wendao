#!/usr/bin/env node
'use strict';
// 验证持久化：登录 -> (无角色则创建) -> 领取离线收益 -> 再登录看数据
// 用法：node verify_persist.cjs [ws://127.0.0.1:8080/ws]

const URL = process.argv[2] || 'ws://127.0.0.1:8080/ws';

function encode(msgId, body) {
  const b = body || Buffer.alloc(0);
  const h = Buffer.alloc(8);
  h.writeUInt32BE(msgId, 0);
  h.writeUInt32BE(b.length, 4);
  return Buffer.concat([h, b]);
}
function readVarint(buf, off) {
  let r = 0n, s = 0n, i = off;
  while (true) { const b = buf[i++]; r |= BigInt(b & 0x7f) << s; if ((b & 0x80) === 0) break; s += 7n; }
  return { v: r, i };
}
function parse(buf) {
  const fs = []; let i = 0;
  while (i < buf.length) {
    const t = readVarint(buf, i); i = t.i;
    const n = Number(t.v >> 3n), w = Number(t.v & 7n);
    if (w === 0) { const v = readVarint(buf, i); i = v.i; fs.push({ n, w, v: v.v }); }
    else if (w === 2) { const l = readVarint(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); }
    else break;
  }
  return fs;
}

const ws = new WebSocket(URL);
ws.binaryType = 'arraybuffer';
let pending = null;
ws.onmessage = (ev) => {
  const b = Buffer.from(ev.data);
  const r = { msgId: b.readUInt32BE(0), len: b.readUInt32BE(4), body: b.slice(8, 8 + b.readUInt32BE(4)) };
  if (pending) { pending(r); pending = null; }
};
function send(id, body) { return new Promise((res) => { pending = res; ws.send(encode(id, body)); }); }

// 从 S2CLogin 解析 has_role(字段3) 与 role(字段4) 里的 playerId/exp/copper
function parseRole(loginBody) {
  let hasRole = 0n, role = null;
  for (const f of parse(loginBody)) {
    if (f.n === 3) hasRole = f.v;
    if (f.n === 4) {
      const r = {};
      for (const x of parse(f.d)) {
        if (x.n === 1) r.playerId = x.v;
        if (x.n === 5) r.exp = x.v;
        if (x.n === 6) r.copper = x.v;
      }
      role = r;
    }
  }
  return { hasRole, role };
}

ws.onopen = async () => {
  // 1) 登录（看当前存档）
  let r = await send(1000);
  let { hasRole, role } = parseRole(r.body);
  console.log('【登录】 has_role=' + (hasRole === 1n ? 'true' : 'false') +
    (role ? ' playerId=' + role.playerId + ' exp=' + role.exp + ' copper=' + role.copper : ''));

  // 2) 无角色则创建
  if (hasRole !== 1n) {
    const nick = Buffer.from('测试玩家', 'utf8');
    const body = Buffer.concat([Buffer.from([0x0A, nick.length]), nick]);
    await send(1002, body);
    console.log('【创建角色】 测试玩家');
  }

  // 3) 领取离线收益（落库）
  await send(2002);
  console.log('【领取离线收益】 完成');

  // 4) 再登录看落库后的数据
  r = await send(1000);
  ({ hasRole, role } = parseRole(r.body));
  console.log('【领取后登录】 exp=' + role.exp + ' copper=' + role.copper);

  ws.close();
  process.exit(0);
};
ws.onerror = (e) => { console.error('WS error', e.message || e); process.exit(1); };
setTimeout(() => { console.error('超时'); process.exit(1); }, 10000);
