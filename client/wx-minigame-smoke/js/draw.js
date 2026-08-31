// 绘制工具（依赖 ctx 与 IMG，通过工厂函数注入）
const theme = require('./theme.js');
module.exports = function (ctx, IMG) {
  function coverDraw(k, x, y, w, h) { const im = IMG[k]; if (!im) return; const ir = im.width / im.height, r = w / h; let sx, sy, sw, sh; if (ir > r) { sh = im.height; sw = sh * r; sx = (im.width - sw) / 2; sy = 0; } else { sw = im.width; sh = sw / r; sx = 0; sy = (im.height - sh) / 2; } ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h); }
  function draw(k, x, y, w, h) { if (IMG[k]) ctx.drawImage(IMG[k], x, y, w, h); }
  function text(s, x, y, size, color, align = 'center', bold = false) { ctx.font = (bold ? 'bold ' : '') + size + 'px sans-serif'; ctx.textAlign = align; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y); }
  function panel(x, y, w, h, color, r = 12) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill(); }
  function roundRectPath(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function btn(b) {
    const T = theme.button;
    const r = T.radius;
    ctx.fillStyle = T.shadow; roundRectPath(b.x + 1, b.y + 3, b.w, b.h, r); ctx.fill();
    const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    g.addColorStop(0, T.bgTop); g.addColorStop(1, T.bgBottom);
    ctx.fillStyle = g; roundRectPath(b.x, b.y, b.w, b.h, r); ctx.fill();
    ctx.fillStyle = T.highlight; roundRectPath(b.x + 3, b.y + 2, b.w - 6, b.h / 2 - 2, r - 2); ctx.fill();
    ctx.strokeStyle = T.border; ctx.lineWidth = T.borderWidth; roundRectPath(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, r); ctx.stroke();
    ctx.strokeStyle = T.innerBorder; ctx.lineWidth = 1; roundRectPath(b.x + 3.5, b.y + 3.5, b.w - 7, b.h - 7, r - 2); ctx.stroke();
    if (T.corner) {
      ctx.fillStyle = T.cornerColor;
      const s = 3;
      ctx.fillRect(b.x + 2, b.y + 2, s, s); ctx.fillRect(b.x + b.w - 2 - s, b.y + 2, s, s);
      ctx.fillRect(b.x + 2, b.y + b.h - 2 - s, s, s); ctx.fillRect(b.x + b.w - 2 - s, b.y + b.h - 2 - s, s, s);
    }
    const label = b.icon ? b.icon + ' ' + b.label : b.label;
    text(label, b.x + b.w / 2, b.y + b.h / 2 + 5, 14, T.textColor, 'center', true);
  }
  function bar(x, y, w, h, color, ratio) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h); }
  return { coverDraw, draw, text, panel, roundRectPath, btn, bar };
};
