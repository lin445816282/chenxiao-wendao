// 验证属性接入闭环：裸装打不过 BOSS → 穿戴+强化后打得过
const URL = 'wss://game.ct256.cn/ws';
const EQUIP_POS = { 2001: 1, 2002: 3 };
function rv(b, o) { let r = 0n, s = 0n, i = o; while (1) { const x = b[i++]; r |= BigInt(x & 127) << s; if ((x & 128) === 0) break; s += 7n; } return { v: r, i }; }
function wv(n) { const a = []; let v = BigInt(n); while (v >= 128n) { a.push(Number(v & 127n) | 128); v >>= 7n; } a.push(Number(v)); return a; }
function p(buf) { const fs = []; let i = 0; while (i < buf.length) { const t = rv(buf, i); i = t.i; const n = Number(t.v >> 3n), w = Number(t.v & 7n); if (w === 0) { const v = rv(buf, i); i = v.i; fs.push({ n, w, v: v.v }); } else if (w === 2) { const l = rv(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); } else break; } return fs; }
function enc(id, body) { const b = body || []; const u = new Uint8Array(8); const dv = new DataView(u.buffer); dv.setUint32(0, id); dv.setUint32(4, b.length); return new Uint8Array(Array.from(u).concat(b)); }
let ws, pending = null;
function send(id, body) { return new Promise((res) => { pending = res; ws.send(enc(id, body).buffer); }); }

function battleSummary(resp) {
  let win = false, heroMaxDmg = 0;
  for (const f of p(resp)) {
    if (f.n === 2) win = f.v === 1n;
    else if (f.n === 4) for (const a of p(f.d)) if (a.n === 2) {
      let atk = 0, dmg = 0;
      for (const x of p(a.d)) { if (x.n === 2) atk = Number(x.v); if (x.n === 6) dmg = Number(x.v); }
      if (atk !== 3 && dmg > heroMaxDmg) heroMaxDmg = dmg;
    }
  }
  return { win, heroMaxDmg };
}
async function listEquip() {
  const [, eqResp] = await send(4000, []);
  const out = [];
  for (const f of p(eqResp)) if (f.n === 2) { const e = p(f.d); const q = { uid: 0, id: 0, pos: 0, s: 0, r: 0 }; for (const x of e) { if (x.n === 1) q.uid = Number(x.v); if (x.n === 2) q.id = Number(x.v); if (x.n === 3) q.pos = Number(x.v); if (x.n === 4) q.s = Number(x.v); if (x.n === 5) q.r = Number(x.v); } out.push(q); }
  return out;
}

(async () => {
  ws = new WebSocket(URL); ws.binaryType = 'arraybuffer';
  ws.onmessage = (ev) => { const u = new Uint8Array(ev.data); const dv = new DataView(u.buffer); const id = dv.getUint32(0), len = dv.getUint32(4); if (pending) { pending([id, u.slice(8, 8 + len)]); pending = null; } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  await send(1000, []);

  const equips = await listEquip();
  console.log('装备数=', equips.length);

  // 1) 脱光所有已穿戴装备（pos>0）
  for (const q of equips) if (q.pos > 0) await send(4002, [0x08].concat(wv(q.uid), [0x10, 0x00]));
  let [, resp] = await send(3000, [0x08, 2, 0x10].concat(wv(2001)));
  let b = battleSummary(resp);
  console.log('【裸装】打 BOSS: win=' + b.win + ' 最大伤害=' + b.heroMaxDmg);

  // 2) 穿戴 1 武器 + 1 衣服，强化武器 10 次
  const wpn = equips.find(q => q.id === 2001);
  const arm = equips.find(q => q.id === 2002);
  if (wpn) await send(4002, [0x08].concat(wv(wpn.uid), [0x10].concat(wv(1))));
  if (arm) await send(4002, [0x08].concat(wv(arm.uid), [0x10].concat(wv(3))));
  if (wpn) for (let i = 0; i < 10; i++) await send(4004, [0x08].concat(wv(wpn.uid)));
  [, resp] = await send(3000, [0x08, 2, 0x10].concat(wv(2001)));
  b = battleSummary(resp);
  console.log('【穿戴+强化10】打 BOSS: win=' + b.win + ' 最大伤害=' + b.heroMaxDmg);
  console.log('结论: ' + (b.heroMaxDmg > 250 ? '属性成长已生效，闭环打通' : '未见成长，需排查'));
  ws.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
