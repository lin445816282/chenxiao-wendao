// 验证扫荡：先打一场记录通关，再扫荡；并验证未通关关卡扫荡被拒。
const URL = 'ws://127.0.0.1:8080/ws';
function rv(b, o) { let r = 0n, s = 0n, i = o; while (1) { const x = b[i++]; r |= BigInt(x & 127) << s; if ((x & 128) === 0) break; s += 7n; } return { v: r, i }; }
function wv(n) { const a = []; let v = BigInt(n); while (v >= 128n) { a.push(Number(v & 127n) | 128); v >>= 7n; } a.push(Number(v)); return a; }
function p(buf) { const fs = []; let i = 0; while (i < buf.length) { const t = rv(buf, i); i = t.i; const n = Number(t.v >> 3n), w = Number(t.v & 7n); if (w === 0) { const v = rv(buf, i); i = v.i; fs.push({ n, w, v: v.v }); } else if (w === 2) { const l = rv(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); } else break; } return fs; }
function enc(id, body) { const b = body || []; const u = new Uint8Array(8); const dv = new DataView(u.buffer); dv.setUint32(0, id); dv.setUint32(4, b.length); return new Uint8Array(Array.from(u).concat(b)); }
let ws, pending = null;
function send(id, body) { return new Promise((res) => { pending = res; ws.send(enc(id, body).buffer); }); }
// 扫荡响应：field1=result, field2=rewards, field3=equips, field4=pets
function parseSweep(resp) {
  const rewards = [], equips = [], pets = []; let code = -1;
  for (const f of p(resp)) {
    if (f.n === 1 && f.w === 2) { for (const x of p(f.d)) if (x.n === 1) code = Number(x.v); }
    else if (f.n === 2 && f.w === 2) { let id = 0, c = 0; for (const x of p(f.d)) { if (x.n === 1) id = x.v; if (x.n === 2) c = Number(x.v); } rewards.push({ id: Number(id), c }); }
    else if (f.n === 3 && f.w === 2) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; equips.push(Number(id)); }
    else if (f.n === 4 && f.w === 2) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; pets.push(Number(id)); }
  }
  return { code, rewards, equips, pets };
}
// 战斗响应：field5=rewards, field6=equips, field7=pets
function parseBattle(resp) {
  const rewards = [], equips = [], pets = []; let win = false;
  for (const f of p(resp)) {
    if (f.n === 2 && f.w === 0) win = (f.v === 1n);
    else if (f.n === 5 && f.w === 2) { let id = 0, c = 0; for (const x of p(f.d)) { if (x.n === 1) id = x.v; if (x.n === 2) c = Number(x.v); } rewards.push({ id: Number(id), c }); }
    else if (f.n === 6 && f.w === 2) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; equips.push(Number(id)); }
    else if (f.n === 7 && f.w === 2) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; pets.push(Number(id)); }
  }
  return { win, rewards, equips, pets };
}
(async () => {
  ws = new WebSocket(URL); ws.binaryType = 'arraybuffer';
  ws.onmessage = (ev) => { const u = new Uint8Array(ev.data); const dv = new DataView(u.buffer, u.byteOffset, u.byteLength); const id = dv.getUint32(0), len = dv.getUint32(4); if (pending) { pending([id, u.slice(8, 8 + len)]); pending = null; } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  await send(1000, []); // 登录

  // 1) 未通关关卡扫荡应被拒（3001 血魔渊，若此前无通关记录）
  {
    const [mid, resp] = await send(3002, [0x08].concat(wv(3), [0x10]).concat(wv(3001), [0x18, 1]));
    const r = parseSweep(resp);
    console.log(`未通关扫荡 3001: msgId=${mid} code=${r.code} (期望 5001)`);
  }

  // 2) 打一场 1001 记录通关
  {
    const [mid, resp] = await send(3000, [0x08].concat(wv(1), [0x10]).concat(wv(1001)));
    const r = parseBattle(resp);
    console.log(`战斗 1001: msgId=${mid} win=${r.win} rewards=${JSON.stringify(r.rewards)} equips=${JSON.stringify(r.equips)} pets=${JSON.stringify(r.pets)}`);
  }

  // 3) 扫荡 1001 × 3
  {
    const [mid, resp] = await send(3002, [0x08].concat(wv(1), [0x10]).concat(wv(1001), [0x18, 3]));
    const r = parseSweep(resp);
    console.log(`扫荡 1001×3: msgId=${mid} code=${r.code} rewards=${JSON.stringify(r.rewards)} equips=${JSON.stringify(r.equips)} pets=${JSON.stringify(r.pets)}`);
  }
  ws.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
