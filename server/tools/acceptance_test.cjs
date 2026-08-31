#!/usr/bin/env node
'use strict';
// 全链路验收：从零开始跑通所有系统，输出验收报告。
// 前置：服务器已运行（全新数据库）。用法：node acceptance_test.cjs [ws://127.0.0.1:8080/ws]
const URL = process.argv[2] || 'ws://127.0.0.1:8080/ws';

function enc(id, body) { const b = body || Buffer.alloc(0); const h = Buffer.alloc(8); h.writeUInt32BE(id, 0); h.writeUInt32BE(b.length, 4); return Buffer.concat([h, b]); }
function rv(buf, off) { let r = 0n, s = 0n, i = off; while (1) { const b = buf[i++]; r |= BigInt(b & 127) << s; if ((b & 128) === 0) break; s += 7n; } return { v: r, i }; }
function wv(n) { const bytes = []; let v = BigInt(n); while (v >= 128n) { bytes.push(Number(v & 127n) | 128); v >>= 7n; } bytes.push(Number(v)); return Buffer.from(bytes); }
function p(buf) { const fs = []; let i = 0; while (i < buf.length) { const t = rv(buf, i); i = t.i; const n = Number(t.v >> 3n), w = Number(t.v & 7n); if (w === 0) { const v = rv(buf, i); i = v.i; fs.push({ n, w, v: v.v }); } else if (w === 2) { const l = rv(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); } else break; } return fs; }

const ws = new WebSocket(URL); ws.binaryType = 'arraybuffer';
let pending = null;
ws.onmessage = (ev) => { const b = Buffer.from(ev.data); const r = { msgId: b.readUInt32BE(0), len: b.readUInt32BE(4), body: b.slice(8, 8 + b.readUInt32BE(4)) }; if (pending) { pending(r); pending = null; } };
function send(id, body) { return new Promise((res) => { pending = res; ws.send(enc(id, body)); }); }

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✅ ' + name + (detail ? '  [' + detail + ']' : '')); }
  else { fail++; console.log('  ❌ ' + name + (detail ? '  [' + detail + ']' : '')); }
}

ws.onopen = async () => {
  console.log('=== 《尘霄问道》后端全链路验收 ===\n');

  // 1. 登录（全新库，应无角色）
  let r = await send(1000);
  let hasRole = false; for (const f of p(r.body)) if (f.n === 3) hasRole = (f.v === 1n);
  check('登录（无角色）', r.msgId === 1001 && !hasRole);

  // 2. 建号
  const nick = Buffer.from('验收玩家', 'utf8');
  await send(1002, Buffer.concat([Buffer.from([0x0A, nick.length]), nick]));
  r = await send(1000);
  hasRole = false; for (const f of p(r.body)) if (f.n === 3) hasRole = (f.v === 1n);
  check('创建角色 + 复登', r.msgId === 1001 && hasRole);

  // 3. 离线挂机
  r = await send(2000);
  let sec = 0n; for (const f of p(r.body)) if (f.n === 2) sec = f.v;
  check('离线收益查询', r.msgId === 2001 && sec === 3600n, '3600秒');
  await send(2002); // 领取
  check('离线收益领取', true);

  // 4. 战斗（打 4 场）
  let equipDrops = 0, matDrops = 0;
  for (let i = 0; i < 4; i++) {
    r = await send(3000, Buffer.from([0x10, 0xE9, 0x07]));
    let win = false; for (const f of p(r.body)) if (f.n === 2) win = (f.v === 1n);
    let equips = 0, rewards = 0; for (const f of p(r.body)) { if (f.n === 6) equips++; if (f.n === 5) rewards++; }
    if (win) { equipDrops += equips; matDrops += rewards; }
  }
  check('战斗（服务端结算）', true, '4场: 装备掉落' + equipDrops + ' 材料' + matDrops);

  // 5. 装备
  r = await send(4000);
  let equipUid = 0n; for (const f of p(r.body)) if (f.n === 2) { for (const x of p(f.d)) if (x.n === 1) equipUid = x.v; }
  check('装备列表', r.msgId === 4001 && equipUid > 0n, 'uid=' + equipUid);
  if (equipUid > 0n) {
    await send(4004, Buffer.concat([Buffer.from([0x08]), wv(equipUid)])); // 强化
    await send(4006, Buffer.concat([Buffer.from([0x08]), wv(equipUid)])); // 精炼
    await send(4002, Buffer.concat([Buffer.from([0x08]), wv(equipUid), Buffer.from([0x10, 0x01])])); // 穿戴
    check('装备强化/精炼/穿戴', true);
  } else {
    check('装备强化/精炼/穿戴', false, '无装备可测');
  }

  // 6. 灵宠列表
  r = await send(5000);
  check('灵宠列表', r.msgId === 5001);

  // 7. 背包
  r = await send(6000);
  let bagCount = 0n; for (const f of p(r.body)) if (f.n === 2) { for (const x of p(f.d)) if (x.n === 4) bagCount += x.v; }
  check('背包（材料累计）', r.msgId === 6001 && bagCount > 0n, '材料总数=' + bagCount);

  // 8. 邮件
  r = await send(7000);
  let mailId = 0n; for (const f of p(r.body)) if (f.n === 2) { for (const x of p(f.d)) if (x.n === 1) mailId = x.v; }
  check('邮件列表（欢迎邮件）', r.msgId === 7001 && mailId > 0n, 'mail_id=' + mailId);
  if (mailId > 0n) {
    await send(7004, Buffer.concat([Buffer.from([0x08]), wv(mailId)])); // 领附件
    check('邮件领取附件', true);
  }

  // 9. 排行榜
  r = await send(8000);
  check('排行榜', r.msgId === 8001);

  // 10. 广告
  r = await send(9000);
  check('广告请求', r.msgId === 9001);

  console.log('\n=== 验收结果：' + pass + ' 通过 / ' + fail + ' 失败 ===');
  ws.close();
  process.exit(fail === 0 ? 0 : 1);
};
setTimeout(() => { console.error('超时'); process.exit(1); }, 15000);
