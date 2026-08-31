// protobuf 编解码（手写最小实现：varint + length-delimited）
function rv(b, o) { let r = 0n, s = 0n, i = o; while (1) { const x = b[i++]; r |= BigInt(x & 127) << s; if ((x & 128) === 0) break; s += 7n; } return { v: r, i }; }
function wv(n) { const a = []; let v = BigInt(n); while (v >= 128n) { a.push(Number(v & 127n) | 128); v >>= 7n; } a.push(Number(v)); return a; }
function p(buf) { const fs = []; let i = 0; while (i < buf.length) { const t = rv(buf, i); i = t.i; const n = Number(t.v >> 3n), w = Number(t.v & 7n); if (w === 0) { const v = rv(buf, i); i = v.i; fs.push({ n, w, v: v.v }); } else if (w === 2) { const l = rv(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); } else break; } return fs; }
function enc(id, body) { const b = body || []; const u = new Uint8Array(8); const dv = new DataView(u.buffer); dv.setUint32(0, id); dv.setUint32(4, b.length); return new Uint8Array(Array.from(u).concat(b)); }
function bytesToStr(b) { let s = '', i = 0; while (i < b.length) { const c = b[i]; if (c < 0x80) { s += String.fromCharCode(c); i++; } else if (c < 0xE0) { s += String.fromCharCode(((c & 31) << 6) | (b[i + 1] & 63)); i += 2; } else if (c < 0xF0) { s += String.fromCharCode(((c & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63)); i += 3; } else { s += String.fromCharCode(((c & 7) << 18) | ((b[i + 1] & 63) << 12) | ((b[i + 2] & 63) << 6) | (b[i + 3] & 63)); i += 4; } } return s; }
function utf8(s) { const a = []; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c < 128) a.push(c); else { const b = encodeURIComponent(s[i]).split('%'); for (let j = 1; j < b.length; j++) a.push(parseInt(b[j], 16)); } } return a; }

module.exports = { rv, wv, p, enc, bytesToStr, utf8 };
