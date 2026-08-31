#!/usr/bin/env node
'use strict';
// 验证装备闭环：建号领收益 -> 打怪掉装备(落库) -> 装备列表 -> 强化 -> 再列表
const URL = process.argv[2] || 'ws://127.0.0.1:8080/ws';

function encode(id, body) { const b = body || Buffer.alloc(0); const h = Buffer.alloc(8); h.writeUInt32BE(id, 0); h.writeUInt32BE(b.length, 4); return Buffer.concat([h, b]); }
function rv(buf, off) { let r = 0n, s = 0n, i = off; while (1) { const b = buf[i++]; r |= BigInt(b & 127) << s; if ((b & 128) === 0) break; s += 7n; } return { v: r, i }; }
function wv(n) { const bytes = []; let v = BigInt(n); while (v >= 128n) { bytes.push(Number(v & 127n) | 128); v >>= 7n; } bytes.push(Number(v)); return Buffer.from(bytes); }
function p(buf) { const fs = []; let i = 0; while (i < buf.length) { const t = rv(buf, i); i = t.i; const n = Number(t.v >> 3n), w = Number(t.v & 7n); if (w === 0) { const v = rv(buf, i); i = v.i; fs.push({ n, w, v: v.v }); } else if (w === 2) { const l = rv(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); } else break; } return fs; }

const ws = new WebSocket(URL); ws.binaryType = 'arraybuffer';
let pending = null;
ws.onmessage = (ev) => { const b = Buffer.from(ev.data); const r = { msgId: b.readUInt32BE(0), len: b.readUInt32BE(4), body: b.slice(8, 8 + b.readUInt32BE(4)) }; if (pending) { pending(r); pending = null; } };
function send(id, body) { return new Promise((res) => { pending = res; ws.send(encode(id, body)); }); }

function parseEquips(body) {
  const out = [];
  for (const f of p(body)) if (f.n === 2) { const sub = p(f.d); const e = {}; for (const x of sub) { if (x.n === 1) e.uid = x.v; if (x.n === 2) e.equipId = x.v; if (x.n === 3) e.pos = x.v; if (x.n === 4) e.lv = x.v; } out.push(e); }
  return out;
}

ws.onopen = async () => {
  // 登录，无角色则建号 + 领收益（确保有铜钱强化）
  let r = await send(1000);
  let hasRole = false; for (const f of p(r.body)) if (f.n === 3) hasRole = (f.v === 1n);
  if (!hasRole) {
    const nick = Buffer.from('测试玩家', 'utf8');
    await send(1002, Buffer.concat([Buffer.from([0x0A, nick.length]), nick]));
    await send(2002);
    console.log('已建号 + 领取收益');
  }

  // 连打 3 场攒装备
  for (let i = 0; i < 3; i++) await send(3000, Buffer.from([0x10, 0xE9, 0x07]));
  console.log('已打 3 场');

  // 装备列表
  r = await send(4000);
  let equips = parseEquips(r.body);
  console.log('装备列表（' + equips.length + ' 件）:');
  equips.forEach((e) => console.log('  uid=' + e.uid + ' equip_id=' + e.equipId + ' pos=' + e.pos + ' 强化=' + e.lv));

  // 强化第一件
  if (equips.length > 0) {
    const uid = equips[0].uid;
    r = await send(4004, Buffer.concat([Buffer.from([0x08]), wv(uid)]));
    let cost = '', newLv = '';
    for (const f of p(r.body)) { if (f.n === 3) cost = f.v; if (f.n === 2) { for (const x of p(f.d)) if (x.n === 4) newLv = x.v; } }
    console.log('强化 uid=' + uid + ' 花费铜钱=' + cost + ' 新强化等级=' + newLv);
  }

  // 再看列表
  r = await send(4000);
  equips = parseEquips(r.body);
  console.log('强化后装备列表:');
  equips.forEach((e) => console.log('  uid=' + e.uid + ' equip_id=' + e.equipId + ' 强化=' + e.lv));

  ws.close(); process.exit(0);
};
ws.onerror = (e) => { console.error('WS error', e.message || e); process.exit(1); };
setTimeout(() => { console.error('超时'); process.exit(1); }, 15000);
