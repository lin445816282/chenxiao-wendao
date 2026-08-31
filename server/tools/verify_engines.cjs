#!/usr/bin/env node
'use strict';
// 验证战斗/挂机引擎已接线：发「离线查询」与「开始战斗」，解码展示真实数据
// 用法：node verify_engines.cjs [ws://127.0.0.1:8080/ws]

const URL = process.argv[2] || 'ws://127.0.0.1:8080/ws';

function encode(msgId, body) {
  const b = body || Buffer.alloc(0);
  const h = Buffer.alloc(8);
  h.writeUInt32BE(msgId, 0);
  h.writeUInt32BE(b.length, 4);
  return Buffer.concat([h, b]);
}

function readVarint(buf, off) {
  let result = 0n, shift = 0n, i = off;
  while (true) {
    const b = buf[i++];
    result |= BigInt(b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7n;
  }
  return { value: result, next: i };
}

// 简易 protobuf 字段解析
function parse(buf) {
  const fields = [];
  let i = 0;
  while (i < buf.length) {
    const t = readVarint(buf, i); i = t.next;
    const num = Number(t.value >> 3n), wt = Number(t.value & 7n);
    if (wt === 0) {
      const v = readVarint(buf, i); i = v.next;
      fields.push({ num, wt, value: v.value });
    } else if (wt === 2) {
      const l = readVarint(buf, i); i = l.next;
      const d = buf.slice(i, i + Number(l.value)); i += Number(l.value);
      fields.push({ num, wt, data: d });
    } else break;
  }
  return fields;
}

const ws = new WebSocket(URL);
ws.binaryType = 'arraybuffer';
let pending = null;
ws.onmessage = (ev) => {
  const buf = Buffer.from(ev.data);
  const r = { msgId: buf.readUInt32BE(0), len: buf.readUInt32BE(4), body: buf.slice(8, 8 + buf.readUInt32BE(4)) };
  if (pending) { pending(r); pending = null; }
};
function send(msgId, body) { return new Promise((res) => { pending = res; ws.send(encode(msgId, body)); }); }

ws.onopen = async () => {
  // 1) 离线收益查询
  let r = await send(2000);
  console.log('【离线收益查询】 msgId=' + r.msgId + ' len=' + r.len);
  for (const f of parse(r.body)) {
    if (f.num === 2) console.log('  · 离线秒数 = ' + f.value);
    if (f.num === 3) {
      const sub = parse(f.data);
      for (let k = 0; k + 1 < sub.length; k += 2) {
        const name = sub[k].value === 2n ? '修为(exp)' : sub[k].value === 1n ? '铜钱(copper)' : 'item_id=' + sub[k].value;
        console.log('  · 奖励 ' + name + ' = ' + sub[k + 1].value);
      }
    }
  }

  // 2) 开始战斗（stage_id=1001 尘息小径）
  r = await send(3000, Buffer.from([0x10, 0xE9, 0x07]));
  console.log('【开始战斗】 msgId=' + r.msgId + ' len=' + r.len);
  for (const f of parse(r.body)) {
    if (f.num === 2) console.log('  · 胜利 = ' + f.value);
    if (f.num === 3) console.log('  · 星级 = ' + f.value);
    if (f.num === 4) console.log('  · 回合数 = ' + parse(f.data).length);
    if (f.num === 5) { const sub = parse(f.data); for (let k = 0; k + 1 < sub.length; k += 2) console.log('  · 掉落材料 item_id=' + sub[k].value + ' 数量=' + sub[k + 1].value); }
    if (f.num === 6) { const sub = parse(f.data); for (const x of sub) if (x.n === 2) console.log('  · 掉落装备 equip_id=' + x.value); }
    if (f.num === 7) { const sub = parse(f.data); for (const x of sub) if (x.n === 2) console.log('  · 掉落灵宠 pet_id=' + x.value); }
  }

  ws.close();
  process.exit(0);
};
ws.onerror = (e) => { console.error('WS error', e.message || e); process.exit(1); };
setTimeout(() => { console.error('超时'); process.exit(1); }, 10000);
