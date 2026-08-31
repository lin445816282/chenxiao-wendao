// 验证战力字段 + 一键穿戴（同部位互斥）+ 装备评分
const URL = 'wss://game.ct256.cn/ws';
const EQUIP_POS = { 2001: 1, 2002: 3 };
function rv(b, o) { let r = 0n, s = 0n, i = o; while (1) { const x = b[i++]; r |= BigInt(x & 127) << s; if ((x & 128) === 0) break; s += 7n; } return { v: r, i }; }
function wv(n) { const a = []; let v = BigInt(n); while (v >= 128n) { a.push(Number(v & 127n) | 128); v >>= 7n; } a.push(Number(v)); return a; }
function p(buf) { const fs = []; let i = 0; while (i < buf.length) { const t = rv(buf, i); i = t.i; const n = Number(t.v >> 3n), w = Number(t.v & 7n); if (w === 0) { const v = rv(buf, i); i = v.i; fs.push({ n, w, v: v.v }); } else if (w === 2) { const l = rv(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); } else break; } return fs; }
function enc(id, body) { const b = body || []; const u = new Uint8Array(8); const dv = new DataView(u.buffer); dv.setUint32(0, id); dv.setUint32(4, b.length); return new Uint8Array(Array.from(u).concat(b)); }
let ws, pending = null;
function send(id, body) { return new Promise((res) => { pending = res; ws.send(enc(id, body).buffer); }); }

async function loginPower() {
  const [, body] = await send(1000, []);
  for (const f of p(body)) if (f.n === 4) { const r = p(f.d); for (const x of r) if (x.n === 7) return Number(x.v); }
  return -1;
}
async function listEquip() {
  const [, eqResp] = await send(4000, []);
  const out = [];
  for (const f of p(eqResp)) if (f.n === 2) { const e = p(f.d); const q = { uid: 0, id: 0, pos: 0, s: 0, r: 0, score: 0 }; for (const x of e) { if (x.n === 1) q.uid = Number(x.v); if (x.n === 2) q.id = Number(x.v); if (x.n === 3) q.pos = Number(x.v); if (x.n === 4) q.s = Number(x.v); if (x.n === 5) q.r = Number(x.v); if (x.n === 7) q.score = Number(x.v); } out.push(q); }
  return out;
}

(async () => {
  ws = new WebSocket(URL); ws.binaryType = 'arraybuffer';
  ws.onmessage = (ev) => { const u = new Uint8Array(ev.data); const dv = new DataView(u.buffer); const id = dv.getUint32(0), len = dv.getUint32(4); if (pending) { pending([id, u.slice(8, 8 + len)]); pending = null; } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  console.log('登录战力 =', await loginPower());

  const equips = await listEquip();
  console.log('装备数 =', equips.length, '评分示例:', equips.slice(0, 3).map(q => 'id' + q.id + '评' + q.score));

  // 一键穿戴：每个部位选背包装备中评分最高的
  const best = {};
  for (const q of equips) { if (q.pos) continue; const t = EQUIP_POS[q.id]; if (!t) continue; if (!best[t] || q.score > best[t].score) best[t] = q; }
  for (const t of Object.keys(best)) await send(4002, [0x08].concat(wv(best[t].uid), [0x10].concat(wv(Number(t)))));

  // 再查：验证同部位唯一
  const after = await listEquip();
  const worn = after.filter(q => q.pos > 0);
  const byPos = {};
  worn.forEach(q => { const t = EQUIP_POS[q.id] || q.pos; byPos[t] = (byPos[t] || 0) + 1; });
  console.log('已穿戴 =', worn.map(q => 'id' + q.id + '@' + (EQUIP_POS[q.id] || q.pos)).join(','), '各部位件数:', JSON.stringify(byPos));

  console.log('一键穿后战力 =', await loginPower());
  ws.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
