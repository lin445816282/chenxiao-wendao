// 战斗特效（粒子/氛围），依赖 ctx 与 particles/ambient 数组引用
module.exports = function (ctx, particles, ambient) {
  function spawn(x, y, color, n = 40) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 200; particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: 0.5 + Math.random() * 0.5, color, size: 3 + Math.random() * 4, g: 420 }); } }
  function renderAmbient(color) { ctx.globalCompositeOperation = 'lighter'; for (const p of ambient) { ctx.globalAlpha = 0.3 + 0.3 * Math.sin(p.ph + Date.now() * 0.002); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  return { spawn, renderAmbient };
};
