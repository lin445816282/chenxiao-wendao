// 真实联调：验证战斗回放解析（crit/dodge/heal + 掉落）与多关卡
const URL = 'wss://game.ct256.cn/ws';
function rv(b, o) { let r = 0n, s = 0n, i = o; while (1) { const x = b[i++]; r |= BigInt(x & 127) << s; if ((x & 128) === 0) break; s += 7n; } return { v: r, i }; }
function wv(n) { const a = []; let v = BigInt(n); while (v >= 128n) { a.push(Number(v & 127n) | 128); v >>= 7n; } a.push(Number(v)); return a; }
function p(buf) { const fs = []; let i = 0; while (i < buf.length) { const t = rv(buf, i); i = t.i; const n = Number(t.v >> 3n), w = Number(t.v & 7n); if (w === 0) { const v = rv(buf, i); i = v.i; fs.push({ n, w, v: v.v }); } else if (w === 2) { const l = rv(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); } else break; } return fs; }
function enc(id, body) { const b = body || []; const u = new Uint8Array(8); const dv = new DataView(u.buffer); dv.setUint32(0, id); dv.setUint32(4, b.length); return new Uint8Array(Array.from(u).concat(b)); }

let ws, pending = null;
function send(id, body) { return new Promise((res) => { pending = res; ws.send(enc(id, body).buffer); }); }

function parseBattle(resp) {
  let win = false, star = 0, actions = []; const rewards = [], equips = [], pets = [];
  for (const f of p(resp)) {
    if (f.n === 2) win = (f.v === 1n);
    else if (f.n === 3) star = Number(f.v);
    else if (f.n === 4) {
      for (const a of p(f.d)) if (a.n === 2) {
        const act = { atk: 1, dmg: 0, heal: 0, crit: false, dodge: false };
        for (const x of p(a.d)) { if (x.n === 2) act.atk = Number(x.v); if (x.n === 6) act.dmg = Number(x.v); if (x.n === 7) act.heal = Number(x.v); if (x.n === 8) act.crit = (x.v === 1n); if (x.n === 9) act.dodge = (x.v === 1n); }
        actions.push(act);
      }
    }
    else if (f.n === 5) { let id = 0, c = 0; for (const x of p(f.d)) { if (x.n === 1) id = x.v; if (x.n === 2) c = Number(x.v); } rewards.push({ id: Number(id), c }); }
    else if (f.n === 6) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; equips.push(Number(id)); }
    else if (f.n === 7) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; pets.push(Number(id)); }
  }
  return { win, star, actions, rewards, equips, pets };
}

(async () => {
  ws = new WebSocket(URL);
  ws.binaryType = 'arraybuffer';
  ws.onmessage = (ev) => { const u = new Uint8Array(ev.data); const dv = new DataView(u.buffer); const id = dv.getUint32(0), len = dv.getUint32(4); if (pending) { pending([id, u.slice(8, 8 + len)]); pending = null; } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const [lid] = await send(1000, []);
  console.log('login msgId =', lid);

  for (const [sid, sty] of [[1001, 1], [1002, 1], [2001, 2], [3001, 3]]) {
    const [mid, resp] = await send(3000, [0x08].concat(wv(sty), [0x10]).concat(wv(sid)));
    const r = parseBattle(resp);
    const crit = r.actions.filter(a => a.crit).length, dodge = r.actions.filter(a => a.dodge).length;
    const toM = r.actions.filter(a => a.atk !== 3), toH = r.actions.filter(a => a.atk === 3);
    console.log(`stage ${sid} type${sty}: msgId=${mid} win=${r.win} star=${r.star} actions=${r.actions.length} (crit=${crit} dodge=${dodge}) toMonster=${toM.length} toHero=${toH.length}`);
    console.log(`  rewards=${JSON.stringify(r.rewards)} equips=${JSON.stringify(r.equips)} pets=${JSON.stringify(r.pets)}`);
  }
  ws.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
