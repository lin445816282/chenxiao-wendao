// 《尘霄问道》仙侠挂机小游戏（微信小游戏完整版）
const SOCKET_URL = 'wss://game.ct256.cn/ws';
const AD_UNIT_ID = ''; // TODO: 填入微信激励视频广告位 ID（留空=测试模式直接完成）

// ===== 模块加载 =====
// protobuf 编解码（手写最小实现：varint + length-delimited）
function rv(b, o) { let r = 0n, s = 0n, i = o; while (1) { const x = b[i++]; r |= BigInt(x & 127) << s; if ((x & 128) === 0) break; s += 7n; } return { v: r, i }; }
function wv(n) { const a = []; let v = BigInt(n); while (v >= 128n) { a.push(Number(v & 127n) | 128); v >>= 7n; } a.push(Number(v)); return a; }
function p(buf) { const fs = []; let i = 0; while (i < buf.length) { const t = rv(buf, i); i = t.i; const n = Number(t.v >> 3n), w = Number(t.v & 7n); if (w === 0) { const v = rv(buf, i); i = v.i; fs.push({ n, w, v: v.v }); } else if (w === 2) { const l = rv(buf, i); i = l.i; const d = buf.slice(i, i + Number(l.v)); i += Number(l.v); fs.push({ n, w, d }); } else break; } return fs; }
function enc(id, body) { const b = body || []; const u = new Uint8Array(8); const dv = new DataView(u.buffer); dv.setUint32(0, id); dv.setUint32(4, b.length); return new Uint8Array(Array.from(u).concat(b)); }
function bytesToStr(b) { let s = '', i = 0; while (i < b.length) { const c = b[i]; if (c < 0x80) { s += String.fromCharCode(c); i++; } else if (c < 0xE0) { s += String.fromCharCode(((c & 31) << 6) | (b[i + 1] & 63)); i += 2; } else if (c < 0xF0) { s += String.fromCharCode(((c & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63)); i += 3; } else { s += String.fromCharCode(((c & 7) << 18) | ((b[i + 1] & 63) << 12) | ((b[i + 2] & 63) << 6) | (b[i + 3] & 63)); i += 4; } } return s; }
function utf8(s) { const a = []; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c < 128) a.push(c); else { const b = encodeURIComponent(s[i]).split('%'); for (let j = 1; j < b.length; j++) a.push(parseInt(b[j], 16)); } } return a; }
// 静态配置（与 server/configs/*.json 对齐，纯数据/纯函数，无运行时状态依赖）
const STAGES = [
  { id: 1001, type: 1, name: '尘息小径', monsterName: '尘息小妖', power: 400, icon: '🌿', img: 'monster' },
  { id: 1002, type: 1, name: '霄影林', monsterName: '霄影精怪', power: 700, icon: '🌲', img: 'monsterElite' },
  { id: 2001, type: 2, name: '玄灵试炼', monsterName: '玄灵魔尊', power: 1500, icon: '🐉', boss: true, img: 'boss' },
  { id: 3001, type: 3, name: '血魔渊', monsterName: '血魔老祖', power: 2200, icon: '🩸', boss: true, img: 'bossBlood' },
];
const ACHIEVEMENTS = [
  { id: 1, name: '初入仙途', desc: '通关第一个关卡' },
  { id: 2, name: '斩妖除魔', desc: '通关全部 4 个关卡' },
  { id: 3, name: '装备初成', desc: '获得第一件装备' },
  { id: 4, name: '灵宠相伴', desc: '获得第一只灵宠' },
  { id: 5, name: '战力过千', desc: '战力达到 1000' },
];
const EQUIP_NAME = { 2001: '青锋剑', 2002: '流云法衣' };
const EQUIP_POS = { 2001: 1, 2002: 3 }; // 装备配置部位（与 equip.json 对齐）
const POS_NAME = { 1: '武器', 2: '头盔', 3: '衣服', 4: '裤子', 5: '鞋子', 6: '项链', 7: '戒指', 8: '护符' };
const EQUIP_BASE = { 2001: { atk: 100, def: 0, hp: 0 }, 2002: { atk: 0, def: 0, hp: 150 } };
const AFFIX_ATTR = { 101: '攻击', 102: '生命', 103: '防御', 104: '攻击' };
const POS_LIST = [1, 2, 3, 4, 5, 6, 7, 8];
const EQUIP_QUALITY = { 2001: 1, 2002: 2 }; // 品质（1凡 2灵 3玄 4地 5天）
const QUALITY_COLOR = { 1: '#c9ccd4', 2: '#4ade80', 3: '#60a5fa', 4: '#c084fc', 5: '#fbbf24' };
const QUALITY_NAME = { 1: '凡品', 2: '灵品', 3: '玄品', 4: '地品', 5: '天品' };
const PET_NAME = { 3001: '雪灵狐', 3002: '玄龟幼兽' };
const PET_BASE = { 3001: { atk: 80, def: 0, hp: 0 }, 3002: { atk: 0, def: 0, hp: 120 } };
const ITEM_NAME = { 5001: '灵石' };
const ITEM_ICON = { 5001: 'iconMaterial' };
// 境界称号：按等级划分，纯展示（仙侠风味）
function realmName(lv) {
  if (lv >= 90) return '真仙境';
  if (lv >= 80) return '渡劫期';
  if (lv >= 70) return '大乘期';
  if (lv >= 60) return '合体期';
  if (lv >= 50) return '炼虚期';
  if (lv >= 40) return '化神期';
  if (lv >= 30) return '元婴期';
  if (lv >= 20) return '金丹期';
  if (lv >= 10) return '筑基期';
  return '炼气期';
}
// 登录页配置（文案/服务器/公告/客服，后续更换只改这里）
const LOGIN = {
  title: '尘霄问道',
  subtitle: '仙侠挂机 · 一念成仙',
  servers: [
    { id: 1, name: '尘霄一区', desc: '推荐' },
    { id: 2, name: '尘霄二区', desc: '新服' },
    { id: 3, name: '尘霄三区', desc: '火爆' },
  ],
  notice: '开服公告：V1.0 正式上线，欢迎各位仙友踏入仙途！',
  customer: '客服反馈：game.ct256.cn',
  agreementUser: '用户协议',
  agreementPrivacy: '隐私政策',
};
// 时装（外观，改变角色立绘，不影响属性）
const FASHIONS = [
  { id: 1, name: '白衣仙袍', img: 'hero' },
  { id: 2, name: '青衫剑客', img: 'heroBlue' },
  { id: 3, name: '金甲战神', img: 'heroGold' },
  { id: 4, name: '赤袍大侠', img: 'heroRed' },
  { id: 5, name: '红衣女侠', img: 'heroFemale' },
  { id: 6, name: '蓝衫女侠', img: 'heroFemaleBlue' },
];
// 协议全文（弹框展示）
const AGREEMENT_USER = [
  '欢迎使用《尘霄问道》！',
  '· 本游戏无充值内购，仅通过广告变现。',
  '· 请遵守平台规则，文明游戏。',
  '· 未成年人受国家网络游戏防沉迷系统保护。',
  '· 请勿使用外挂、脚本等破坏游戏公平的行为。',
];
const AGREEMENT_PRIVACY = [
  '我们依法收集以下信息用于提供服务：',
  '· 微信 OpenID（登录鉴权、保存角色存档）',
  '· 昵称、游戏数据（等级/装备/灵宠等）',
  '· 不收集身份证、银行卡、通讯录、精确位置。',
  '· 不会向第三方出售您的个人信息。',
  '· 未成年人受防沉迷系统保护。',
];

function equipColor(id) { return QUALITY_COLOR[EQUIP_QUALITY[id]] || '#ffffff'; }
function equipQualityName(id) { return QUALITY_NAME[EQUIP_QUALITY[id]] || ''; }
function calcPetAttrs(q) {
  const b = PET_BASE[q.id] || { atk: 0, def: 0, hp: 0 };
  const lvMult = 1 + 0.2 * (q.lv - 1), starMult = 1 + 0.2 * q.star;
  return { atk: Math.round(b.atk * lvMult * starMult), def: Math.round(b.def * lvMult), hp: Math.round(b.hp * lvMult) };
}
// 音效 + BGM（Web Audio 程序生成，无需音频文件）
let audioCtx = null;
let soundOn = true, bgmOn = true;
try { soundOn = wx.getStorageSync('cxwd_sound') !== 0; bgmOn = wx.getStorageSync('cxwd_bgm') !== 0; } catch (e) {}
let bgmTimer = null, bgmStarted = false;
const BGM = [523, 587, 659, 784, 880, 784, 659, 587]; // 古风五声音阶循环

function initAudio() { try { audioCtx = wx.createWebAudioContext(); } catch (e) { audioCtx = null; } }
function playTone(freq, dur, type, vol) {
  if (!audioCtx || !soundOn) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol; g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + dur);
}
function sndClick() { playTone(880, 0.06, 'sine', 0.18); }
function sndHit() { playTone(200, 0.14, 'square', 0.22); }
function sndCrit() { playTone(150, 0.2, 'sawtooth', 0.28); }
function sndVictory() { playTone(523, 0.1, 'sine', 0.22); setTimeout(() => playTone(659, 0.1, 'sine', 0.22), 110); setTimeout(() => playTone(784, 0.25, 'sine', 0.22), 220); }
function sndDodge() { playTone(1200, 0.06, 'sine', 0.14); }
function sndOpen() { playTone(660, 0.06, 'sine', 0.13); }
function sndClose() { playTone(440, 0.06, 'sine', 0.11); }
function sndDrop() { playTone(587, 0.09, 'sine', 0.2); setTimeout(() => playTone(880, 0.12, 'sine', 0.2), 90); }
function sndUpgrade() { playTone(523, 0.08, 'triangle', 0.2); setTimeout(() => playTone(784, 0.14, 'triangle', 0.2), 80); }
function sndError() { playTone(180, 0.15, 'square', 0.16); }
function startBGM() {
  if (bgmStarted || !audioCtx || !bgmOn) return;
  bgmStarted = true;
  let i = 0;
  const step = () => { if (!bgmOn) { bgmTimer = null; bgmStarted = false; return; } playTone(BGM[i % BGM.length], 0.5, 'sine', 0.06); i++; bgmTimer = setTimeout(step, 460); };
  step();
}
function setSoundOn(v) { soundOn = v; try { wx.setStorageSync('cxwd_sound', v ? 1 : 0); } catch (e) {} }
function setBgmOn(v) { bgmOn = v; try { wx.setStorageSync('cxwd_bgm', v ? 1 : 0); } catch (e) {} if (v) startBGM(); }
function getSoundOn() { return soundOn; }
function getBgmOn() { return bgmOn; }

const audio = {
  initAudio, playTone, startBGM,
  sndClick, sndHit, sndCrit, sndVictory, sndDodge, sndOpen, sndClose, sndDrop, sndUpgrade, sndError,
  setSoundOn, setBgmOn, getSoundOn, getBgmOn,
};

// ===== 画布 =====
let SW = 375, SH = 667, DPR = 1, SAFE_TOP = 0, SAFE_BOTTOM = 0;
let sysInfoReady = false;
function applySystemInfo(si) { SW = si.windowWidth; SH = si.windowHeight; DPR = si.pixelRatio || 1; if (si.safeArea) { SAFE_TOP = si.safeArea.top; SAFE_BOTTOM = si.windowHeight - si.safeArea.bottom; } }
try { applySystemInfo(wx.getSystemInfoSync()); sysInfoReady = true; } catch (e) {}
const canvas = wx.createCanvas();
canvas.width = SW * DPR; canvas.height = SH * DPR;
const ctx = canvas.getContext('2d');
ctx.scale(DPR, DPR);
let GROUND = Math.round(SH * 0.57);

// ===== 状态 =====
let scene = 'home', connected = false, hasRole = false;
let nickname = '', level = 0, exp = 0, copper = 0, power = 0, welcomed = false, prevLevel = 0, heroAngle = 0, draggingHero = false, dragStartX = 0;
let rewardedAd = null, adBizId = '';
let log = [], buttons = [], battle = null, modal = null;
let equipData = [], petData = [], mailData = [], bagItems = [], selIdx = 0, selEquip = null, equipPopup = null;
// 新手引导
const GUIDE_KEY = 'cxwd_tutorial_v1';
let guide = null, tutorialDone = false;
try { tutorialDone = !!wx.getStorageSync(GUIDE_KEY); } catch (e) {}
// 隐私协议同意标记
const PRIVACY_KEY = 'cxwd_privacy_v1';
let privacyAgreed = false;
try { privacyAgreed = !!wx.getStorageSync(PRIVACY_KEY); } catch (e) {}
// 登录页状态
let loginAgreed = false, curServer = 0;
// 时装状态
let curFashion = 0;
try { const f = wx.getStorageSync('cxwd_fashion'); if (typeof f === 'number' && f >= 0 && f < FASHIONS.length) curFashion = f; } catch (e) {}
function currentFashion() { return FASHIONS[curFashion] || FASHIONS[0]; }
function achDone(a) {
  switch (a.id) {
    case 1: return stageProgress.cleared.length >= 1;
    case 2: return stageProgress.cleared.length >= 4;
    case 3: return equipData.length >= 1;
    case 4: return petData.length >= 1;
    case 5: return power >= 1000;
  }
  return false;
}
// 关卡进度（本地记录：通关与星级）
const STAGE_KEY = 'cxwd_stage_v1';
let stageProgress = { cleared: [], stars: {} };
try { const sp = wx.getStorageSync(STAGE_KEY); if (sp && sp.cleared) stageProgress = sp; } catch (e) {}
function saveStage() { try { wx.setStorageSync(STAGE_KEY, stageProgress); } catch (e) {} }
function stageUnlocked(s) { if (s.id === 1001) return true; const i = STAGES.findIndex(x => x.id === s.id); return i > 0 && stageProgress.cleared.indexOf(STAGES[i - 1].id) >= 0; }

// ===== 网络 =====
let ws = null, pending = null, reconnectTimer = null;
function connect() {
  if (ws) { try { ws.close({ fail: () => {} }); } catch (e) {} }
  ws = wx.connectSocket({ url: SOCKET_URL });
  ws.onOpen(() => { connected = true; addLog('正在进入尘霄问道...'); doLogin(); });
  ws.onMessage((res) => { const u = new Uint8Array(res.data); const dv = new DataView(u.buffer); const id = dv.getUint32(0), len = dv.getUint32(4); if (pending) { pending([id, u.slice(8, 8 + len)]); pending = null; } });
  ws.onError(() => { connected = false; addLog('连接失败，重连中'); scheduleReconnect(); });
  ws.onClose(() => { if (connected) { connected = false; addLog('断开，重连中'); scheduleReconnect(); } });
}
function scheduleReconnect() { if (reconnectTimer) return; reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 3000); }
function send(id, body) {
  return new Promise((res) => {
    if (!ws || !connected) { res([0, new Uint8Array(0)]); return; }
    pending = res;
    ws.send({ data: enc(id, body).buffer, fail: () => { if (pending) { pending = null; res([0, new Uint8Array(0)]); } } });
  });
}

// ===== 图片 =====
const IMG = {};
function load(k, p) { const im = wx.createImage(); im.src = p; im.onload = () => IMG[k] = im; }
load('bg', 'images/bg_home.png'); load('bgBattle', 'images/bg_battle.png');
load('hero', 'images/hero_male.png'); load('heroFemale', 'images/hero_female.png'); load('heroBlue', 'images/hero_blue.png'); load('heroGold', 'images/hero_gold.png'); load('heroRed', 'images/hero_red.png'); load('heroFemaleBlue', 'images/hero_female_blue.png'); load('monster', 'images/monster_basic.png'); load('monsterElite', 'images/monster_elite.png'); load('boss', 'images/boss.png'); load('bossBlood', 'images/boss_blood.png'); load('pet', 'images/pet_linghu.png'); load('petXuanwu', 'images/pet_xuanwu.png'); load('iconWeapon', 'images/icon_weapon.png'); load('iconArmor', 'images/icon_armor.png'); load('iconMaterial', 'images/icon_material.png');

// 绘制工具已抽到 js/draw.js（见下方 require）
function addLog(s) { log.unshift(s); if (log.length > 3) log.pop(); }

// ===== 特效 =====
let particles = [], slashes = [], shake = 0, arcLife = 0, flashHero = 0, flashMonster = 0, flashPet = 0, combo = 0, battleSpeed = 1, bossFlash = 0, levelUpFlash = 0;
let ambient = [];
for (let i = 0; i < 26; i++) ambient.push({ x: Math.random() * SW, y: Math.random() * SH, r: 1 + Math.random() * 2.5, sp: 10 + Math.random() * 25, ph: Math.random() * 6.28 });
let fade = 0;

// 绘制工具 + 特效模块（依赖 ctx/IMG/particles/ambient，故在此加载）
const drawMod = (// 绘制工具（依赖 ctx 与 IMG，通过工厂函数注入）
function (ctx, IMG) {
  const theme = {
    button: { radius: 4, bgTop: '#c9a24b', bgBottom: '#7a5a1e', border: '#e8c96a', borderWidth: 1.5, innerBorder: '#4a3416', highlight: 'rgba(255,235,180,0.22)', shadow: 'rgba(0,0,0,0.45)', textColor: '#f7ecc8', corner: true, cornerColor: '#e8c96a' },
    panel: { border: 'rgba(200,162,75,0.35)', borderWidth: 1 },
    accent: '#e8c96a', accentSoft: '#f7ecc8',
  };
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
})(ctx, IMG);
const { coverDraw, draw, text, panel, roundRectPath, btn, bar } = drawMod;
const fxMod = (// 战斗特效（粒子/氛围），依赖 ctx 与 particles/ambient 数组引用
function (ctx, particles, ambient) {
  function spawn(x, y, color, n = 40) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 200; particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: 0.5 + Math.random() * 0.5, color, size: 3 + Math.random() * 4, g: 420 }); } }
  function renderAmbient(color) { ctx.globalCompositeOperation = 'lighter'; for (const p of ambient) { ctx.globalAlpha = 0.3 + 0.3 * Math.sin(p.ph + Date.now() * 0.002); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  return { spawn, renderAmbient };
})(ctx, particles, ambient);
const { spawn, renderAmbient } = fxMod;
const pagesMod = (// 独立页面：设置 / 成就 / 隐私（工厂函数注入依赖，函数体内用同名局部变量）
function (P) {
  const { ctx, SW, SH, coverDraw, text, panel, btn, renderAmbient, audio, ACHIEVEMENTS, achDone } = P;

  function renderPrivacy() {
    coverDraw('bg', 0, 0, SW, SH);
    ctx.fillStyle = 'rgba(8,16,30,0.9)'; ctx.fillRect(0, 0, SW, SH);
    text('《尘霄问道》', SW / 2, 56, 24, '#ffd76a', 'center', true);
    text('用户协议与隐私政策', SW / 2, 84, 16, '#fff', 'center', true);
    panel(18, 104, SW - 36, SH - 270, 'rgba(15,25,45,0.92)', 14);
    const lines = [
      '欢迎游玩《尘霄问道》！请仔细阅读：',
      '',
      '【隐私政策】',
      '· 登录需使用微信 OpenID 创建并保存角色存档。',
      '· 收集：OpenID、昵称、游戏数据（等级/装备/灵宠等）。',
      '· 不收集身份证、银行卡、通讯录、精确位置等敏感信息。',
      '· 不会向任何第三方出售您的个人信息。',
      '',
      '【用户协议】',
      '· 本游戏无充值内购，仅通过广告变现。',
      '· 请遵守平台规则，文明游戏。',
      '· 未成年人受国家网络游戏防沉迷系统保护。',
      '',
      '点击「同意并继续」即表示您已阅读并同意以上全部内容。',
    ];
    lines.forEach((s, i) => text(s, 34, 132 + i * 22, 12, s.indexOf('【') === 0 ? '#ffd76a' : '#e0e0e0', 'left', s.indexOf('【') === 0));
    btn({ x: 30, y: SH - 152, w: SW - 60, h: 50, label: '同意并继续' });
    btn({ x: 30, y: SH - 92, w: SW - 60, h: 40, label: '不同意' });
  }

  function renderSettings() {
    coverDraw('bg', 0, 0, SW, SH);
    ctx.fillStyle = 'rgba(10,22,40,0.6)'; ctx.fillRect(0, 0, SW, SH);
    renderAmbient('#ffe9a0');
    text('设置', SW / 2, 46, 22, '#ffd76a', 'center', true);
    btn({ x: 15, y: 16, w: 72, h: 36, label: '返回' });
    panel(15, 70, SW - 30, 56, 'rgba(15,25,45,0.85)', 12);
    text('音效', 30, 92, 14, '#fff', 'left', true);
    text(audio.getSoundOn() ? '开' : '关', SW - 40, 92, 14, audio.getSoundOn() ? '#4ade80' : '#f87171', 'right', true);
    panel(15, 134, SW - 30, 56, 'rgba(15,25,45,0.85)', 12);
    text('背景音乐', 30, 156, 14, '#fff', 'left', true);
    text(audio.getBgmOn() ? '开' : '关', SW - 40, 156, 14, audio.getBgmOn() ? '#4ade80' : '#f87171', 'right', true);
    btn({ x: 15, y: 210, w: SW - 30, h: 48, label: '清缓存并重置引导' });
    btn({ x: 15, y: 268, w: SW - 30, h: 48, label: '用户协议与隐私政策' });
    btn({ x: 15, y: 326, w: SW - 30, h: 48, label: '分享给好友' });
    btn({ x: 15, y: 384, w: SW - 30, h: 48, label: '成就' });
    btn({ x: 15, y: 442, w: SW - 30, h: 48, label: '退出登录' });
    text('《尘霄问道》v1.0.0', SW / 2, 500, 12, '#9ab', 'center');
  }

  function renderAchievements() {
    coverDraw('bg', 0, 0, SW, SH);
    ctx.fillStyle = 'rgba(10,22,40,0.6)'; ctx.fillRect(0, 0, SW, SH);
    renderAmbient('#ffe9a0');
    text('成就', SW / 2, 46, 22, '#ffd76a', 'center', true);
    btn({ x: 15, y: 16, w: 72, h: 36, label: '返回' });
    const done = ACHIEVEMENTS.filter(achDone).length;
    text('已达成 ' + done + ' / ' + ACHIEVEMENTS.length, SW / 2, 80, 13, '#9ab', 'center');
    ACHIEVEMENTS.forEach((a, i) => {
      const py = 100 + i * 78;
      const ok = achDone(a);
      panel(15, py, SW - 30, 68, ok ? 'rgba(25,42,70,0.9)' : 'rgba(15,22,35,0.7)', 12);
      if (ok) { ctx.strokeStyle = 'rgba(74,222,128,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(15, py, SW - 30, 68); }
      text((ok ? '🏆 ' : '🔒 ') + a.name, 30, py + 26, 15, ok ? '#ffd76a' : '#777', 'left', true);
      text(a.desc, 30, py + 48, 12, ok ? '#e0e0e0' : '#666', 'left');
      text(ok ? '已达成' : '未达成', SW - 30, py + 34, 12, ok ? '#4ade80' : '#777', 'right');
    });
  }

  return { renderPrivacy, renderSettings, renderAchievements };
})({ ctx, SW, SH, coverDraw, text, panel, btn, renderAmbient, audio, ACHIEVEMENTS, achDone });
const { renderPrivacy, renderSettings, renderAchievements } = pagesMod;

// ===== 弹窗 =====
function showModal(title, lines, buttons) { modal = { title, lines, buttons }; sndOpen(); }
function closeModal() { modal = null; sndClose(); }
function modalButtonLayout() {
  const mw = SW - 50, mh = Math.min(SH - 200, 400), my = 130;
  let bw = 88, gap = 10, bh = 40;
  const maxW = mw - 40;
  let total = modal.buttons.length * bw + (modal.buttons.length - 1) * gap;
  if (total > maxW && modal.buttons.length > 1) { bw = Math.floor((maxW - (modal.buttons.length - 1) * gap) / modal.buttons.length); total = modal.buttons.length * bw + (modal.buttons.length - 1) * gap; }
  return { bw, bh, gap, bx0: (SW - total) / 2, by: my + mh - 54 };
}
function renderModal() {
  if (!modal) return;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, SW, SH);
  const mw = SW - 50, mh = Math.min(SH - 200, 400), mx = 25, my = 130;
  panel(mx, my, mw, mh, 'rgba(15,25,45,0.96)', 16);
  text(modal.title, SW / 2, my + 32, 18, '#ffd76a', 'center', true);
  modal.lines.slice(0, 6).forEach((s, i) => text(s, mx + 20, my + 60 + i * 26, 14, '#e8e8e8', 'left'));
  const L = modalButtonLayout();
  let bx = L.bx0;
  modal.buttons.forEach(b => { btn({ x: bx, y: L.by, w: L.bw, h: L.bh, label: b.label }); bx += L.bw + L.gap; });
}

// ===== 新手引导 =====
function renderGuide() {
  if (!guide || scene !== 'home' || modal) return;
  const t = Date.now() * 0.004;
  if (guide.phase === 'intro') {
    ctx.fillStyle = 'rgba(0,0,0,0.74)'; ctx.fillRect(0, 0, SW, SH);
    panel(25, 140, SW - 50, 340, 'rgba(15,25,45,0.97)', 16);
    text('— 尘霄问道 —', SW / 2, 182, 22, '#ffd76a', 'center', true);
    const lines = ['你本是尘霄山下无名散修，', '机缘巧合踏入仙途。', '初入「尘息小径」历练一番，', '斩妖夺机缘，收灵宠相伴！'];
    lines.forEach((s, i) => text(s, SW / 2, 224 + i * 32, 15, '#e8e8e8', 'center'));
    const pulse = 0.5 + 0.5 * Math.sin(t);
    panel(SW / 2 - 62, 396, 124, 44, 'rgba(37,99,235,0.95)', 20);
    ctx.strokeStyle = 'rgba(255,213,90,' + (0.5 + 0.5 * pulse) + ')'; ctx.lineWidth = 2; ctx.strokeRect(SW / 2 - 66, 392, 132, 52);
    text('开始历练', SW / 2, 424, 17, '#fff', 'center', true);
    return;
  }
  if (guide.phase === 'fighting') return;
  const pulse = 0.5 + 0.5 * Math.sin(t);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, SW, SH);
  let msg;
  if (guide.phase === 'attr') {
    const tx = SW / 2 - 70, ty = 428, tw = 140, th = 28;
    ctx.strokeStyle = 'rgba(255,213,90,' + (0.5 + 0.5 * pulse) + ')'; ctx.lineWidth = 3 + pulse * 2;
    ctx.strokeRect(tx - 5, ty - 5, tw + 10, th + 10);
    text('⚔ 战力 ' + power, SW / 2, ty + th / 2 + 5, 14, '#fff', 'center', true);
    text('▼', SW / 2, ty - 20 + Math.sin(t) * 8, 24, '#ffd76a', 'center', true);
    msg = '战力代表你的实力，点击查看属性';
  } else {
    const label = guide.phase === 'battle' ? '战斗' : guide.phase === 'claim' ? '领收益' : '装备';
    const target = buttons.find(b => b.label === label);
    if (target) {
      ctx.strokeStyle = 'rgba(255,213,90,' + (0.5 + 0.5 * pulse) + ')'; ctx.lineWidth = 3 + pulse * 2;
      ctx.strokeRect(target.x - 5, target.y - 5, target.w + 10, target.h + 10);
      btn(target);
      text('▼', target.x + target.w / 2, target.y - 26 + Math.sin(t) * 8, 24, '#ffd76a', 'center', true);
    }
    msg = guide.phase === 'battle' ? '点击【战斗】，开启第一次历练！' : guide.phase === 'claim' ? '首战归来！点击【领收益】领取离线修为～' : '点击【装备】，用「一键穿」提升战力！';
  }
  const bw = Math.min(SW - 60, 300), bx = (SW - bw) / 2, by = 118;
  panel(bx, by, bw, 70, 'rgba(10,20,35,0.96)', 14);
  text(msg, SW / 2, by + 40, 14, '#ffe9b0', 'center', true);
  text('（点击高亮区域继续）', SW / 2, by + 58, 11, '#9ab', 'center');
}

// ===== 游戏操作 =====
async function doLogin() {
  const [, body] = await send(1000, []);
  let hr = false, role = null; for (const f of p(body)) { if (f.n === 3) hr = (f.v === 1n); if (f.n === 4) role = f.d; }
  hasRole = hr;
  if (role) { for (const f of p(role)) { if (f.n === 2) nickname = bytesToStr(f.d); if (f.n === 4) level = Number(f.v); if (f.n === 5) exp = Number(f.v); if (f.n === 6) copper = Number(f.v); if (f.n === 7) power = Number(f.v); } if (prevLevel && level > prevLevel) { sndUpgrade(); levelUpFlash = 1; addLog('等级提升！Lv.' + prevLevel + ' → Lv.' + level); } prevLevel = level; if (!welcomed) { welcomed = true; addLog('欢迎回来，' + nickname); } fetchEquip(); if (!tutorialDone && !guide) guide = { phase: 'intro' }; }
  else if (!hr) { /* 自动建号 */ const nb = utf8('尘霄散修'); await send(1002, [0x0A, nb.length].concat(nb)); await doLogin(); }
}
async function doClaim() { const [, body] = await send(2006, []); let r = []; for (const f of p(body)) if (f.n === 2) { const s = p(f.d); r.push((s[0].v === 2n ? '修为' : '铜钱') + s[1].v); } addLog('在线挂机收益：' + (r.join(' ') || '无')); await doLogin(); }
async function doBattle(stageId, stageType) {
  const body = [0x08].concat(wv(stageType), [0x10]).concat(wv(stageId)); // field1=stage_type, field2=stage_id
  const [, resp] = await send(3000, body);
  let win = false, star = 0, actions = []; const rewards = [], equips = [], pets = [];
  for (const f of p(resp)) {
    if (f.n === 2) win = (f.v === 1n);
    else if (f.n === 3) star = Number(f.v);
    else if (f.n === 4) {
      for (const a of p(f.d)) if (a.n === 2) {
        const act = { atk: 1, tgt: 1, dmg: 0, heal: 0, crit: false, dodge: false };
        for (const x of p(a.d)) { if (x.n === 2) act.atk = Number(x.v); if (x.n === 4) act.tgt = Number(x.v); if (x.n === 6) act.dmg = Number(x.v); if (x.n === 7) act.heal = Number(x.v); if (x.n === 8) act.crit = (x.v === 1n); if (x.n === 9) act.dodge = (x.v === 1n); }
        actions.push(act);
      }
    }
    else if (f.n === 5) { let id = 0, c = 0; for (const x of p(f.d)) { if (x.n === 1) id = x.v; if (x.n === 2) c = Number(x.v); } rewards.push({ id: Number(id), c }); }
    else if (f.n === 6) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; equips.push(Number(id)); }
    else if (f.n === 7) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; pets.push(Number(id)); }
  }
  if (win) { if (stageProgress.cleared.indexOf(stageId) < 0) stageProgress.cleared.push(stageId); if (star > (stageProgress.stars[stageId] || 0)) stageProgress.stars[stageId] = star; saveStage(); }
  const stage = STAGES.find(s => s.id === stageId) || STAGES[0];
  const hasPet = actions.some(a => a.atk === 2 || a.tgt === 2);
  combo = 0; fade = 0; scene = 'battle'; battle = { t: 0, pushed: 0, hits: [], done: false, hasPet, res: { win, star, actions, rewards, equips, pets }, stage };
}
async function doStages() { scene = 'stages'; fade = 0; }
async function doSweep(stageId, stageType) {
  const [, resp] = await send(3002, [0x08].concat(wv(stageType), [0x10]).concat(wv(stageId), [0x18].concat(wv(1))));
  let code = -1; const rewards = [], equips = [], pets = [];
  for (const f of p(resp)) {
    if (f.n === 1) { for (const x of p(f.d)) if (x.n === 1) code = Number(x.v); }
    else if (f.n === 2) { let id = 0, c = 0; for (const x of p(f.d)) { if (x.n === 1) id = x.v; if (x.n === 2) c = Number(x.v); } rewards.push({ id: Number(id), c }); }
    else if (f.n === 3) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; equips.push(Number(id)); }
    else if (f.n === 4) { let id = 0; for (const x of p(f.d)) if (x.n === 2) id = x.v; pets.push(Number(id)); }
  }
  if (code > 0) { showModal('扫荡失败', ['需先手动挑战通关该关卡后，才能扫荡。'], [{ label: '知道了', fn: closeModal }]); return; }
  const lines = [];
  rewards.forEach(r => lines.push((r.id === 1 ? '铜钱' : r.id === 2 ? '修为' : (ITEM_NAME[r.id] || '材料')) + ' × ' + r.c));
  equips.forEach(id => lines.push('⚔ ' + (EQUIP_NAME[id] || '装备#' + id)));
  pets.forEach(id => lines.push('🐾 ' + (PET_NAME[id] || '灵宠#' + id)));
  if (!lines.length) lines.push('本次无掉落');
  sndDrop();
  showModal('扫荡结果', lines, [{ label: '确定', fn: closeModal }]);
  await doLogin();
}
function skipBattle() {
  if (!battle || battle.done) return;
  sndClick();
  battle.pushed = battle.res.actions.length;
  battle.t = Math.max(battle.t, 0.4 + battle.pushed * (0.45 / battleSpeed) + 0.6);
}
async function fetchEquip() {
  const [, body] = await send(4000, []);
  equipData = [];
  for (const f of p(body)) if (f.n === 2) {
    const e = p(f.d); const q = { pos: 0, s: 0, r: 0, score: 0, affixes: [] };
    for (const x of e) {
      if (x.n === 1) q.uid = Number(x.v);
      if (x.n === 2) q.id = Number(x.v);
      if (x.n === 3) q.pos = Number(x.v);
      if (x.n === 4) q.s = Number(x.v);
      if (x.n === 5) q.r = Number(x.v);
      if (x.n === 6) { const af = p(x.d); let aid = 0, av = 0; for (const y of af) { if (y.n === 1) aid = Number(y.v); if (y.n === 2) av = Number(y.v); } q.affixes.push({ aid, av }); }
      if (x.n === 7) q.score = Number(x.v);
    }
    equipData.push(q);
  }
  if (selEquip) { const fresh = equipData.find(q => q.uid === selEquip.uid); selEquip = fresh || null; }
}
async function doEquip() { await fetchEquip(); selIdx = 0; scene = 'equip'; fade = 0; }
function selectedEquip() { if (selEquip) return selEquip; const bag = equipData.filter(q => !q.pos); return bag[selIdx] || null; }
async function wearSelected() { const q = selectedEquip(); if (!q) return; const pos = q.pos ? 0 : (EQUIP_POS[q.id] || 1); await send(4002, [0x08].concat(wv(q.uid), [0x10].concat(wv(pos)))); sndUpgrade(); addLog(q.pos ? '已脱下 ' + (EQUIP_NAME[q.id] || '装备') : '已穿戴 ' + (EQUIP_NAME[q.id] || '装备')); selEquip = null; equipPopup = null; await doLogin(); await fetchEquip(); }
async function autoWear() {
  const best = {};
  for (const q of equipData) { if (q.pos) continue; const t = EQUIP_POS[q.id]; if (!t) continue; if (!best[t] || q.score > best[t].score) best[t] = q; }
  const list = Object.values(best);
  for (const q of list) await send(4002, [0x08].concat(wv(q.uid), [0x10].concat(wv(EQUIP_POS[q.id]))));
  if (list.length) sndUpgrade();
  addLog('已一键穿戴最强 ×' + list.length);
  await doLogin(); await fetchEquip();
}
async function strengthen() { const q = selectedEquip(); if (!q) return; await send(4004, [0x08].concat(wv(q.uid))); sndUpgrade(); addLog('已强化 ' + (EQUIP_NAME[q.id] || '装备')); equipPopup = null; await doLogin(); await fetchEquip(); }
async function refine() { const q = selectedEquip(); if (!q) return; await send(4006, [0x08].concat(wv(q.uid))); sndUpgrade(); addLog('已精炼 ' + (EQUIP_NAME[q.id] || '装备')); equipPopup = null; await doLogin(); await fetchEquip(); }
async function decompose() { const q = selectedEquip(); if (!q) return; await send(4008, [0x08].concat(wv(q.uid))); sndUpgrade(); addLog('已分解 ' + (EQUIP_NAME[q.id] || '装备') + ' → 铜钱'); equipPopup = null; await doLogin(); await fetchEquip(); }
function petName() { const p = petData.find(q => q.combat); return p ? (PET_NAME[p.id] || '灵宠') : '灵宠'; }
function calcAttrs() {
  let atk = 200, def = 50, hp = 2000;
  for (const q of equipData) { if (!q.pos) continue; const b = EQUIP_BASE[q.id] || { atk: 0, def: 0, hp: 0 }; atk += b.atk + q.s * 5 + q.r * 3; def += b.def; hp += b.hp; }
  return { atk, def, hp };
}
function equipAttrs(q) {
  const b = EQUIP_BASE[q.id] || { atk: 0, def: 0, hp: 0 };
  let atk = b.atk + q.s * 5 + q.r * 3, def = b.def, hp = b.hp;
  for (const af of q.affixes) { if (AFFIX_ATTR[af.aid] === '攻击') atk += af.av; else if (AFFIX_ATTR[af.aid] === '防御') def += af.av; else if (AFFIX_ATTR[af.aid] === '生命') hp += af.av; }
  return { atk, def, hp };
}
async function showAttrs() {
  await fetchEquip();
  const a = calcAttrs();
  const worn = equipData.filter(q => q.pos).map(q => POS_NAME[EQUIP_POS[q.id]] + ':' + (EQUIP_NAME[q.id] || '装备'));
  showModal('属性', ['境界 ' + realmName(level) + ' · 战力 ' + power, '攻击 ' + a.atk, '防御 ' + a.def, '生命 ' + a.hp, '已穿戴 ' + (worn.join(' ') || '无')], [{ label: '关闭', fn: closeModal }]);
}
async function fetchPet() {
  const [, body] = await send(5000, []);
  petData = [];
  for (const f of p(body)) if (f.n === 2) { const e = p(f.d); const q = { combat: false, lv: 1, exp: 0, star: 0 }; for (const x of e) { if (x.n === 1) q.uid = Number(x.v); if (x.n === 2) q.id = Number(x.v); if (x.n === 3) q.lv = Number(x.v); if (x.n === 4) q.exp = Number(x.v); if (x.n === 5) q.star = Number(x.v); if (x.n === 7) q.combat = (x.v === 1n); } petData.push(q); }
}
async function doPet() { await fetchPet(); selIdx = 0; scene = 'pet'; fade = 0; }
function selectedPet() { return petData[selIdx] || null; }
async function setCombat() { const q = selectedPet(); if (!q) return; await send(5002, [0x08].concat(wv(q.uid), [0x10, q.combat ? 0 : 1])); addLog(q.combat ? '已让' + (PET_NAME[q.id] || '灵宠') + '休息' : '已让' + (PET_NAME[q.id] || '灵宠') + '出战'); await doLogin(); await fetchPet(); }
async function upgradePet() { const q = selectedPet(); if (!q) return; await send(5004, [0x08].concat(wv(q.uid))); sndUpgrade(); addLog('已升级 ' + (PET_NAME[q.id] || '灵宠')); await doLogin(); await fetchPet(); }
async function evolvePet() { const q = selectedPet(); if (!q) return; await send(5006, [0x08].concat(wv(q.uid))); sndUpgrade(); addLog('已进化 ' + (PET_NAME[q.id] || '灵宠')); await doLogin(); await fetchPet(); }
async function fetchBag() {
  const [, body] = await send(6000, []);
  bagItems = [];
  for (const f of p(body)) if (f.n === 2) { const it = p(f.d); const q = {}; for (const x of it) { if (x.n === 1) q.uid = Number(x.v); if (x.n === 2) q.id = Number(x.v); if (x.n === 4) q.c = Number(x.v); } bagItems.push(q); }
}
async function doBag() { await fetchBag(); selIdx = 0; scene = 'bag'; fade = 0; }
async function useItem() {
  const q = bagItems[selIdx]; if (!q) return;
  await send(6002, [0x08].concat(wv(q.uid), [0x10, 0x01]));
  sndUpgrade();
  addLog('已使用 ' + (ITEM_NAME[q.id] || '材料#' + q.id) + ' ×1 → 铜钱');
  await doLogin(); await fetchBag();
}
async function doMail() {
  const [, body] = await send(7000, []);
  mailData = [];
  for (const f of p(body)) if (f.n === 2) { const e = p(f.d); const q = {}; for (const x of e) { if (x.n === 1) q.id = Number(x.v); if (x.n === 3) q.title = bytesToStr(x.d); if (x.n === 7) q.claimed = (x.v === 1n); } mailData.push(q); }
  const lines = mailData.length ? mailData.map((q, i) => '[' + (i + 1) + '] ' + q.title + (q.claimed ? '（已领）' : '')) : ['暂无邮件'];
  const hasUnclaimed = mailData.some(q => !q.claimed);
  showModal('邮件', lines, hasUnclaimed ? [{ label: '一键领取', fn: claimAllMail }, { label: '关闭', fn: closeModal }] : [{ label: '关闭', fn: closeModal }]);
}
async function claimMail() { if (!mailData.length) return; await send(7004, [0x08].concat(wv(mailData[0].id))); addLog('已领取邮件附件'); closeModal(); await doMail(); }
async function claimAllMail() {
  const unclaimed = mailData.filter(q => !q.claimed);
  if (!unclaimed.length) return;
  for (const q of unclaimed) await send(7004, [0x08].concat(wv(q.id)));
  sndDrop();
  addLog('已领取全部邮件 ×' + unclaimed.length);
  closeModal(); await doLogin(); await doMail();
}
async function doRank() { const [, body] = await send(8000, []); const list = []; for (const f of p(body)) if (f.n === 2) { const e = p(f.d); const r = {}; for (const x of e) { if (x.n === 1) r.no = x.v; if (x.n === 3) r.nick = bytesToStr(x.d); if (x.n === 6) r.sc = Number(x.v); } list.push('#' + r.no + '  ' + r.nick + '  战力 ' + r.sc); } showModal('排行榜', list.length ? list : ['暂无数据'], [{ label: '关闭', fn: closeModal }]); }

// ===== 渲染 =====
function layout() { buttons = []; const w = 84, h = 48, g = 8; const bottom = [{ label: '战斗', icon: '⚔' }, { label: '领收益', icon: '✨' }, { label: '装备', icon: '🛡' }, { label: '灵宠', icon: '🐾' }]; const top = [{ label: '背包', icon: '🎒' }, { label: '邮件', icon: '✉' }, { label: '排行', icon: '🏆' }]; bottom.forEach((b, i) => buttons.push({ x: 15 + i * (w + g), y: SH - 12 - h - SAFE_BOTTOM, w, h, label: b.label, icon: b.icon })); const topW = 3 * w + 2 * g; top.forEach((b, i) => buttons.push({ x: (SW - topW) / 2 + i * (w + g), y: SH - 12 - 2 * h - g - SAFE_BOTTOM, w, h, label: b.label, icon: b.icon })); buttons.push({ x: SW - 84, y: 14 + SAFE_TOP, w: 70, h: 36, label: '设置', icon: '⚙' }); }
function renderHome() {
  coverDraw('bg', 0, 0, SW, SH);
  ctx.fillStyle = 'rgba(10,22,40,0.3)'; ctx.fillRect(0, 0, SW, SH);
  renderAmbient('#ffe9a0');
  text('尘霄问道', SW / 2, 46, 26, '#fff', 'center', true);
  text('● ' + (connected ? '已连接' : '未连接'), SW / 2, 70, 12, connected ? '#4ade80' : '#f87171');
  ctx.save();
  ctx.translate(SW / 2, 92 + 142);
  ctx.rotate(heroAngle * 0.35);
  if (heroAngle < 0) ctx.scale(-1, 1);
  draw(currentFashion().img, -80, -142, 160, 284);
  const wornWpn = equipData.find(q => q.pos === 1);
  const wornArm = equipData.find(q => q.pos === 3);
  if (wornWpn) draw('iconWeapon', 18, -38, 34, 34);
  if (wornArm) draw('iconArmor', -62, -14, 44, 44);
  ctx.restore();
  text('← 左右拖动旋转 →', SW / 2, 402, 10, '#9ab', 'center');
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(SW / 2, 388, 62, 10, 0, 0, Math.PI * 2); ctx.fill();
  text((hasRole ? nickname : '未建号') + '  ·  ' + realmName(level) + '  Lv.' + level, SW / 2, 414, 18, '#ffd76a', 'center', true);
  text('⚔ 战力 ' + power + '　ⓘ', SW / 2, 438, 14, '#7cc4ff', 'center', true);
  panel(SW / 2 - 92, 448, 184, 48, 'rgba(0,0,0,0.45)', 12);
  text('修为 ' + exp + '   铜钱 ' + copper, SW / 2, 466, 12, '#ffe9b0');
  const needExp = Math.max(1, level * 1000);
  bar(SW / 2 - 82, 476, 164, 6, '#e8c96a', Math.min(1, exp / needExp));
  text('升级 ' + exp + ' / ' + needExp, SW / 2, 490, 9, '#9ab', 'center');
  panel(20, 504, SW - 40, 100, 'rgba(15,25,45,0.6)', 14);
  text('离线修炼中', 34, 532, 14, '#ffd76a', 'left', true);
  text('修为 +2/秒 · 铜钱 +5/秒 · 离线有收益', 34, 556, 12, '#e8e8e8', 'left');
  text('看广告可翻倍 →', 34, 580, 12, '#7cc4ff', 'left');
  panel(20, 610, SW - 40, 108, 'rgba(15,25,45,0.55)', 12);
  text('— 记录 —', SW / 2, 632, 12, '#9ab', 'center');
  log.forEach((s, i) => text(s, 32, 656 + i * 24, 13, '#e8e8e8', 'left'));
  layout(); for (const b of buttons) btn(b);
  if (levelUpFlash > 0) {
    ctx.fillStyle = 'rgba(255,215,106,' + (levelUpFlash * 0.3) + ')';
    ctx.fillRect(0, 0, SW, SH);
    text('✨ 等级提升 ✨', SW / 2, SH / 2, 30, 'rgba(255,240,180,' + levelUpFlash + ')', 'center', true);
  }
}
function renderStages() {
  coverDraw('bg', 0, 0, SW, SH);
  ctx.fillStyle = 'rgba(10,22,40,0.55)'; ctx.fillRect(0, 0, SW, SH);
  renderAmbient('#ffe9a0');
  text('秘境关卡', SW / 2, 56, 24, '#ffd76a', 'center', true);
  text('提升战力，逐关推进', SW / 2, 82, 12, '#9ab', 'center');
  STAGES.forEach((s, i) => {
    const cx = 20, cy = 108 + i * 122, cw = SW - 40, ch = 108;
    const unlocked = stageUnlocked(s), cleared = stageProgress.cleared.indexOf(s.id) >= 0;
    const star = stageProgress.stars[s.id] || 0;
    panel(cx, cy, cw, ch, unlocked ? 'rgba(15,25,45,0.9)' : 'rgba(10,14,24,0.97)', 14);
    if (!unlocked) { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1); }
    else if (cleared) { ctx.strokeStyle = 'rgba(74,222,128,0.55)'; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, cw, ch); }
    else { ctx.strokeStyle = 'rgba(255,213,90,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, cw, ch); }
    text(s.icon, cx + 34, cy + ch / 2 + 8, 34, unlocked ? '#fff' : '#555', 'center');
    text(s.name, cx + 76, cy + 36, 18, unlocked ? '#fff' : '#777', 'left', true);
    const bad = s.boss ? 'BOSS' : '普通', bc = s.boss ? 'rgba(220,38,38,0.92)' : 'rgba(37,99,235,0.92)';
    ctx.fillStyle = bc; ctx.beginPath(); const br = 6; const bx = cx + 76, by = cy + 46, bw2 = 44, bh2 = 18; ctx.moveTo(bx + br, by); ctx.arcTo(bx + bw2, by, bx + bw2, by + bh2, br); ctx.arcTo(bx + bw2, by + bh2, bx, by + bh2, br); ctx.arcTo(bx, by + bh2, bx, by, br); ctx.arcTo(bx, by, bx + bw2, by, br); ctx.fill();
    text(bad, bx + bw2 / 2, by + 14, 11, '#fff', 'center', true);
    text('推荐战力 ' + s.power, cx + 76, cy + 84, 12, '#9ab', 'left');
    if (!unlocked) text('🔒 未解锁', cx + cw - 16, cy + ch / 2 + 6, 14, '#777', 'right');
    else if (cleared) {
      text('★'.repeat(star) + '☆'.repeat(3 - star), cx + cw - 16, cy + 28, 15, '#ffc53d', 'right');
      btn({ x: cx + cw - 78, y: cy + 44, w: 62, h: 30, label: '扫荡' });
      text('已通关', cx + cw - 16, cy + 96, 10, '#4ade80', 'right');
    }
    else text('挑战 →', cx + cw - 16, cy + ch / 2 + 6, 14, '#ffd76a', 'right', true);
  });
  btn({ x: 15, y: SH - 60, w: 90, h: 44, label: '返回' });
}
function renderEquip() {
  coverDraw('bg', 0, 0, SW, SH);
  ctx.fillStyle = 'rgba(10,22,40,0.6)'; ctx.fillRect(0, 0, SW, SH);
  renderAmbient('#ffe9a0');
  text('装备', SW / 2, 46, 22, '#ffd76a', 'center', true);
  btn({ x: 15, y: 16, w: 72, h: 36, label: '返回' });
  btn({ x: SW - 87, y: 16, w: 72, h: 36, label: '时装' });
  // 已穿戴 8 槽位（2行×4列）
  const cw = 82, ch = 68, gx = 6, gy = 6, ox = 15, oy = 60;
  const ft = Date.now() * 0.003;
  for (let i = 0; i < 8; i++) {
    const px = ox + (i % 4) * (cw + gx), py = oy + Math.floor(i / 4) * (ch + gy);
    const pos = POS_LIST[i];
    const eq = equipData.find(q => q.pos === pos);
    panel(px, py, cw, ch, eq ? 'rgba(25,42,70,0.95)' : 'rgba(15,22,35,0.75)', 10);
    if (eq) { const isSel = selEquip && selEquip.uid === eq.uid; ctx.strokeStyle = isSel ? '#ffd56a' : equipColor(eq.id); ctx.lineWidth = isSel ? 2.5 : 2; ctx.strokeRect(px, py, cw, ch); }
    text(POS_NAME[pos], px + cw / 2, py + 13, 10, '#9ab', 'center');
    if (eq) {
      const icon = pos === 1 ? 'iconWeapon' : pos === 3 ? 'iconArmor' : null;
      if (icon) {
        const fy = Math.sin(ft + i) * 2, glow = 0.5 + 0.3 * Math.sin(ft * 1.5 + i);
        ctx.globalAlpha = glow; ctx.globalCompositeOperation = 'lighter';
        draw(icon, px + cw / 2 - 16, py + 18 + fy, 32, 32);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        draw(icon, px + cw / 2 - 16, py + 18 + fy, 32, 32);
        text(EQUIP_NAME[eq.id] || '装备', px + cw / 2, py + 60, 10, equipColor(eq.id), 'center', true);
      } else {
        text(EQUIP_NAME[eq.id] || '装备', px + cw / 2, py + 40, 12, equipColor(eq.id), 'center', true);
        text('+' + eq.s + '/' + eq.r, px + cw / 2, py + 56, 10, '#7cc4ff', 'center');
      }
    } else text('空', px + cw / 2, py + 42, 13, '#555', 'center');
  }
  // 背包装备
  const bag = equipData.filter(q => !q.pos);
  text('背包（' + bag.length + ' 件，点击选中）', ox, 222, 12, '#ffd76a', 'left', true);
  const ly = 234, lh = 36, lg = 3;
  bag.slice(0, 6).forEach((q, i) => {
    const py = ly + i * (lh + lg);
    const sel = selIdx === i;
    panel(ox, py, SW - 30, lh, sel ? 'rgba(37,99,235,0.55)' : 'rgba(15,25,45,0.85)', 9);
    ctx.fillStyle = equipColor(q.id); ctx.fillRect(ox + 2, py + 4, 4, lh - 8);
    if (sel) { ctx.strokeStyle = 'rgba(255,213,90,0.85)'; ctx.lineWidth = 2; ctx.strokeRect(ox, py, SW - 30, lh); }
    text(EQUIP_NAME[q.id] || '装备#' + q.id, ox + 12, py + 17, 13, equipColor(q.id), 'left', true);
    text('+' + q.s + '/' + q.r + ' 评' + q.score, ox + 12, py + 32, 10, '#9ab', 'left');
    text(POS_NAME[EQUIP_POS[q.id]] || '', SW - 42, py + 24, 11, '#7cc4ff', 'right');
  });
  if (!bag.length) text('背包空空如也，去战斗获取装备吧', SW / 2, 300, 13, '#9ab', 'center');
  // 选中详情 + 操作
  const sel = selectedEquip();
  if (sel) {
    const a = equipAttrs(sel);
    const affLines = sel.affixes.map(af => '·' + (AFFIX_ATTR[af.aid] || '属性') + '+' + af.av).join('  ');
    const wornSame = !sel.pos ? equipData.find(q => q.pos === EQUIP_POS[sel.id]) : null;
    const panelH = wornSame ? 118 : 92;
    panel(ox, 476, SW - 30, panelH, 'rgba(15,25,45,0.92)', 12);
    text(EQUIP_NAME[sel.id] + '（' + equipQualityName(sel.id) + '·' + (POS_NAME[EQUIP_POS[sel.id]] || '') + '）', ox + 14, 498, 14, equipColor(sel.id), 'left', true);
    text('攻击+' + a.atk + '  防御+' + a.def + '  生命+' + a.hp, ox + 14, 520, 13, '#fff', 'left');
    text(affLines || '无词条', ox + 14, 540, 11, '#7cc4ff', 'left');
    text('强化+' + sel.s + '  精炼+' + sel.r + '  评分' + sel.score, ox + 14, 558, 11, '#9ab', 'left');
    if (wornSame) {
      const wa = equipAttrs(wornSame), c = (n) => (n > 0 ? '+' + n : n);
      text('对比当前: 攻' + c(a.atk - wa.atk) + ' 防' + c(a.def - wa.def) + ' 血' + c(a.hp - wa.hp), ox + 14, 578, 11, '#ffd56a', 'left');
    }
    const by = 476 + panelH + 6;
    btn({ x: ox, y: by, w: 108, h: 44, label: sel.pos ? '脱下' : '穿戴' });
    btn({ x: ox + 116, y: by, w: 108, h: 44, label: '强化' });
    btn({ x: ox + 232, y: by, w: 128, h: 44, label: '精炼' });
    btn({ x: ox, y: by + 52, w: 176, h: 42, label: '分解' });
    btn({ x: ox + 184, y: by + 52, w: 176, h: 42, label: '⚔ 一键穿' });
  } else {
    btn({ x: ox, y: 480, w: SW - 30, h: 44, label: '⚔ 一键穿戴最强' });
  }
}
function renderEquipDetail() {
  if (!equipPopup) return;
  const q = equipPopup;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, SW, SH);
  const mw = SW - 60, mx = 30, my = 140, mh = 330;
  panel(mx, my, mw, mh, 'rgba(15,25,45,0.97)', 16);
  const a = equipAttrs(q);
  const affLines = q.affixes.map(af => '·' + (AFFIX_ATTR[af.aid] || '属性') + '+' + af.av).join('  ');
  text(EQUIP_NAME[q.id] + '（' + equipQualityName(q.id) + '）', SW / 2, my + 34, 17, equipColor(q.id), 'center', true);
  const icon = EQUIP_POS[q.id] === 1 ? 'iconWeapon' : EQUIP_POS[q.id] === 3 ? 'iconArmor' : null;
  if (icon) { const ft = Date.now() * 0.003, fy = Math.sin(ft) * 2; draw(icon, SW / 2 - 22, my + 46 + fy, 44, 44); }
  text('攻击+' + a.atk + '  防御+' + a.def + '  生命+' + a.hp, SW / 2, my + 118, 14, '#fff', 'center');
  text(affLines || '无词条', SW / 2, my + 140, 12, '#7cc4ff', 'center');
  text('强化+' + q.s + '  精炼+' + q.r + '  评分' + q.score, SW / 2, my + 160, 12, '#9ab', 'center');
  const wornSame = !q.pos ? equipData.find(w => w.pos === EQUIP_POS[q.id]) : null;
  if (wornSame) {
    const wa = equipAttrs(wornSame), c = (n) => (n > 0 ? '+' + n : n);
    text('对比当前: 攻' + c(a.atk - wa.atk) + ' 防' + c(a.def - wa.def) + ' 血' + c(a.hp - wa.hp), SW / 2, my + 182, 12, '#ffd56a', 'center');
  }
  btn({ x: mx + 14, y: my + 200, w: 94, h: 40, label: q.pos ? '脱下' : '穿戴' });
  btn({ x: mx + 116, y: my + 200, w: 94, h: 40, label: '强化' });
  btn({ x: mx + 218, y: my + 200, w: 98, h: 40, label: '精炼' });
  btn({ x: mx + 14, y: my + 248, w: 154, h: 40, label: '分解' });
  btn({ x: mx + 176, y: my + 248, w: 140, h: 40, label: '关闭' });
}
function renderBattle() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  coverDraw('bgBattle', 0, 0, SW, SH);
  ctx.fillStyle = 'rgba(10,22,40,0.18)'; ctx.fillRect(0, 0, SW, SH);
  renderAmbient('#9fd8ff');
  if (!battle) { ctx.restore(); return; }
  const t = battle.t; const hl = (t % 1) < 0.25 ? 18 : 0; const ms = ((t + 0.25) % 1) < 0.1 ? 10 : 0;
  const st = battle.stage; const isBoss = st && st.boss;
  text('秘境 · ' + st.name, SW / 2, 40, 18, '#fff', 'center', true);
  if (!battle.done) btn({ x: SW - 162, y: 16, w: 70, h: 34, label: '⏭ 跳过' });
  btn({ x: SW - 84, y: 16, w: 70, h: 34, label: battleSpeed === 1 ? '⏩ 2x' : '▶ 1x' });
  if (isBoss && t < 1.4) { const a = Math.min(1, t * 2); text('⚠ BOSS 来袭', SW / 2, GROUND - 210, Math.round(30 * (0.8 + 0.2 * a)), 'rgba(255,90,90,' + a + ')', 'center', true); }
  if (arcLife > 0) { ctx.strokeStyle = 'rgba(255,240,190,0.25)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(SW / 2, GROUND - 110, 120, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke(); ctx.strokeStyle = 'rgba(255,245,205,0.95)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(SW / 2, GROUND - 110, 120, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke(); }
  const mknock = flashMonster > 0 ? 8 : 0, hknock = flashHero > 0 ? -6 : 0;
  const mw = isBoss ? 190 : 150, mh = isBoss ? 190 : 150, mx = SW - mw - 24 - ms + mknock, my = GROUND - mh, mcx = mx + mw / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(99, GROUND + 5, 52, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(mcx, GROUND + 5, mw * 0.36, 10, 0, 0, Math.PI * 2); ctx.fill();
  text('尘霄散修', 99, GROUND - 278, 12, '#b7f0c0', 'center', true);
  text((isBoss ? 'BOSS · ' : '') + st.monsterName, mcx, my - 12, 12, isBoss ? '#ff8080' : '#ffd2d2', 'center', true);
  const hasPet = battle.hasPet, pcx = 168, px = 128, py = GROUND - 84;
  if (hasPet) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(pcx, GROUND + 4, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
    text(petName(), pcx, py - 6, 11, '#ffe9b0', 'center', true);
    draw('pet', px, py, 80, 80);
    if (flashPet > 0) { ctx.globalAlpha = 0.7; ctx.globalCompositeOperation = 'lighter'; draw('pet', px, py, 80, 80); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  }
  const mimg = st.img || 'monster';
  draw('hero', 24 + hl + hknock, GROUND - 267, 150, 267);
  // 主角武器（动态：攻击时挥动旋转 + 发光）
  const wpnX = 128 + hl + hknock, wpnY = GROUND - 172;
  ctx.save();
  ctx.translate(wpnX, wpnY);
  if (arcLife > 0) ctx.rotate(-0.7 + (0.35 - arcLife) * 5);
  const wpnGlow = 0.5 + 0.35 * Math.sin(t * 4);
  ctx.globalAlpha = wpnGlow; ctx.globalCompositeOperation = 'lighter';
  draw('iconWeapon', -17, -17, 34, 34);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  draw('iconWeapon', -17, -17, 34, 34);
  ctx.restore();
  const dieA = (battle.done && battle.res.win) ? Math.max(0, 1 - (battle.t - (battle.doneTime || battle.t)) * 3) : 1;
  ctx.globalAlpha = dieA;
  draw(mimg, mx, my, mw, mh);
  ctx.globalAlpha = 1;
  if (flashHero > 0) { ctx.globalAlpha = 0.7; ctx.globalCompositeOperation = 'lighter'; draw('hero', 24 + hl, GROUND - 267, 150, 267); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  if (flashMonster > 0) { ctx.globalAlpha = 0.7; ctx.globalCompositeOperation = 'lighter'; draw(mimg, mx, my, mw, mh); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  // 动态血条（按攻击方/受击方阵营累计）
  let dmgM = 0, dmgMT = 0, dmgH = 0, dmgHT = 0, dmgP = 0, dmgPT = 0;
  for (const a of battle.res.actions) { if (a.atk === 3) { if (a.tgt === 2) dmgPT += a.dmg; else dmgHT += a.dmg; } else dmgMT += a.dmg; }
  for (let i = 0; i < battle.pushed; i++) { const a = battle.res.actions[i]; if (a.atk === 3) { if (a.tgt === 2) dmgP += a.dmg; else dmgH += a.dmg; } else dmgM += a.dmg; }
  bar(24, GROUND + 16, 150, 10, '#3ddc84', 1 - (dmgHT ? dmgH / dmgHT : 0));
  if (hasPet) bar(118, GROUND + 30, 100, 8, '#7cc4ff', 1 - (dmgPT ? dmgP / dmgPT : 0));
  bar(mx, GROUND + 16, mw, 12, '#ff5c5c', 1 - (dmgMT ? dmgM / dmgMT : 0));
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) { ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
  for (const s of slashes) {
    const pr = s.life / s.max, sx = s.x + s.dx * pr;
    const a = Math.max(0, 1 - Math.abs(pr - 0.5) * 1.5);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.crit ? '#ffd54a' : '#9fd8ff';
    ctx.beginPath(); ctx.ellipse(sx, s.y, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a * 0.5;
    ctx.beginPath(); ctx.ellipse(sx - s.dx * 0.2, s.y, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (combo >= 2 && !battle.done) {
    const cb = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
    ctx.globalAlpha = cb;
    text(combo + ' 连击!', SW / 2, GROUND - 252, Math.min(26, 16 + combo), '#ffd56a', 'center', true);
    ctx.globalAlpha = 1;
  }
  for (const h of battle.hits) {
    const a = 1 - h.life, sway = Math.sin(h.life * 8) * 6, hy = GROUND - 210 - h.life * 60;
    if (h.kind === 'dodge') text('闪避', SW / 2 + h.x + sway, hy, 20, 'rgba(170,170,180,' + a + ')', 'center', true);
    else if (h.kind === 'heal') text('+' + h.v, SW / 2 + h.x, hy, 22, 'rgba(74,222,128,' + a + ')', 'center', true);
    else { const col = h.crit ? 'rgba(255,205,60,' + a + ')' : 'rgba(255,95,95,' + a + ')'; text('-' + h.v, SW / 2 + h.x + sway, hy, h.crit ? 34 : 24, col, 'center', true); }
  }
  if (battle.done && battle.t > (battle.doneTime || 0) + 0.4) {
    const w = battle.res.win; const loot = [];
    if (w) {
      battle.res.equips.forEach(id => loot.push(['⚔ ' + (EQUIP_NAME[id] || '装备#' + id), '#8ac4ff']));
      battle.res.pets.forEach(id => loot.push(['🐾 ' + (PET_NAME[id] || '灵宠#' + id), '#ffd0a0']));
      battle.res.rewards.forEach(r => loot.push([(r.id === 1 ? '铜钱' : r.id === 2 ? '修为' : '材料') + ' × ' + r.c, '#ffe9b0']));
      if (!loot.length) loot.push(['本次未掉落，再接再厉', '#9ab']);
    } else loot.push(['战力不足，强化装备 / 升级灵宠后再战', '#ff9b9b']);
    const ph = Math.min(SH - 130, 168 + loot.length * 26), py = SH - 44 - ph;
    panel(15, py, SW - 30, ph, 'rgba(10,20,35,0.95)', 16);
    text(w ? '⚔ 战斗胜利' : '💀 战斗失败', SW / 2, py + 34, 22, w ? '#ffd76a' : '#ff7b7b', 'center', true);
    const starT = battle.t - (battle.doneTime || 0) - 0.4;
    for (let si = 0; si < 3; si++) {
      const earned = si < battle.res.star;
      const pr = Math.max(0, Math.min(1, (starT - si * 0.15) / 0.2));
      if (pr <= 0) continue;
      ctx.globalAlpha = pr;
      text(earned ? '★' : '☆', SW / 2 + (si - 1) * 30, py + 58, Math.round(10 + 10 * pr), earned ? '#ffc53d' : '#556', 'center');
      ctx.globalAlpha = 1;
    }
    if (w) text('— 战利品 —', SW / 2, py + 82, 12, '#9ab', 'center');
    loot.forEach(([s, c], i) => text(s, SW / 2, py + 104 + i * 24, 15, c, 'center'));
    btn({ x: 30, y: py + ph - 46, w: 156, h: 40, label: '⚔ 再战一次' });
    btn({ x: 204, y: py + ph - 46, w: 156, h: 40, label: '返回' });
  }
  if (bossFlash > 0) {
    ctx.fillStyle = 'rgba(255,45,45,' + (bossFlash * 0.45) + ')';
    ctx.fillRect(0, 0, SW, SH);
    if (bossFlash > 0.3) text('⚠ 魔神之怒', SW / 2, GROUND - 280, 24, 'rgba(255,120,120,' + bossFlash + ')', 'center', true);
  }
  ctx.restore();
}
// renderPrivacy 已抽到 js/pages.js
function renderPet() {
  coverDraw('bg', 0, 0, SW, SH);
  ctx.fillStyle = 'rgba(10,22,40,0.6)'; ctx.fillRect(0, 0, SW, SH);
  renderAmbient('#ffe9a0');
  text('灵宠', SW / 2, 46, 22, '#ffd76a', 'center', true);
  btn({ x: 15, y: 16, w: 72, h: 36, label: '返回' });
  if (!petData.length) { text('暂无灵宠，去挑战 BOSS 获取吧', SW / 2, 260, 14, '#9ab', 'center'); return; }
  const ly = 70, lh = 60, lg = 6;
  petData.slice(0, 4).forEach((q, i) => {
    const py = ly + i * (lh + lg);
    const sel = selIdx === i;
    panel(15, py, SW - 30, lh, sel ? 'rgba(37,99,235,0.5)' : 'rgba(15,25,45,0.85)', 10);
    if (sel) { ctx.strokeStyle = 'rgba(255,213,90,0.85)'; ctx.lineWidth = 2; ctx.strokeRect(15, py, SW - 30, lh); }
    draw(q.id === 3002 ? 'petXuanwu' : 'pet', 18, py + 6, 48, 48);
    text((PET_NAME[q.id] || '灵宠') + (q.combat ? ' 【出战】' : ''), 72, py + 22, 14, '#ffd0a0', 'left', true);
    text('Lv.' + q.lv + '  ★' + q.star, 72, py + 42, 11, '#9ab', 'left');
  });
  const sel = petData[selIdx];
  if (sel) {
    const a = calcPetAttrs(sel);
    panel(15, 350, SW - 30, 130, 'rgba(15,25,45,0.92)', 12);
    text(PET_NAME[sel.id] + '（' + (sel.combat ? '出战中' : '未出战') + '）', 29, 372, 14, '#ffd0a0', 'left', true);
    text('Lv.' + sel.lv + '  ★' + sel.star + '  攻击+' + a.atk + '  防御+' + a.def + '  生命+' + a.hp, 29, 394, 12, '#fff', 'left');
    const needPetExp = Math.max(1, sel.lv * 500);
    bar(29, 402, SW - 60, 5, '#e8c96a', Math.min(1, sel.exp / needPetExp));
    text('经验 ' + sel.exp + ' / ' + needPetExp, 29, 418, 10, '#9ab', 'left');
    text('技能：随主人攻击，分担伤害', 29, 436, 11, '#7cc4ff', 'left');
    text('升级提升属性 · 进化提升星级', 29, 456, 11, '#9ab', 'left');
    btn({ x: 15, y: 486, w: 108, h: 44, label: sel.combat ? '休息' : '出战' });
    btn({ x: 131, y: 486, w: 108, h: 44, label: '升级' });
    btn({ x: 247, y: 486, w: 128, h: 44, label: '进化' });
  }
}
function renderBag() {
  coverDraw('bg', 0, 0, SW, SH);
  ctx.fillStyle = 'rgba(10,22,40,0.6)'; ctx.fillRect(0, 0, SW, SH);
  renderAmbient('#ffe9a0');
  text('背包', SW / 2, 46, 22, '#ffd76a', 'center', true);
  btn({ x: 15, y: 16, w: 72, h: 36, label: '返回' });
  if (!bagItems.length) { text('背包空空如也，去战斗获取吧', SW / 2, 260, 14, '#9ab', 'center'); return; }
  const cw = 82, ch = 82, g = 6, ox = 15, oy = 70;
  bagItems.forEach((q, i) => {
    const px = ox + (i % 4) * (cw + g), py = oy + Math.floor(i / 4) * (ch + g);
    const sel = selIdx === i;
    panel(px, py, cw, ch, sel ? 'rgba(37,99,235,0.55)' : 'rgba(15,25,45,0.85)', 10);
    if (sel) { ctx.strokeStyle = 'rgba(255,213,90,0.85)'; ctx.lineWidth = 2; ctx.strokeRect(px, py, cw, ch); }
    draw(ITEM_ICON[q.id] || 'iconMaterial', px + cw / 2 - 20, py + 10, 40, 40);
    text(ITEM_NAME[q.id] || '材料#' + q.id, px + cw / 2, py + 60, 11, '#ffe9b0', 'center', true);
    text('×' + q.c, px + cw / 2, py + 75, 11, '#fff', 'center', true);
  });
  const sel = bagItems[selIdx];
  if (sel) {
    panel(15, 440, SW - 30, 110, 'rgba(15,25,45,0.92)', 12);
    text(ITEM_NAME[sel.id] || '材料#' + sel.id, 30, 464, 14, '#ffe9b0', 'left', true);
    text('数量 ×' + sel.c, 30, 486, 12, '#fff', 'left');
    text('使用后兑换铜钱 ×' + (sel.c * 50), 30, 506, 11, '#7cc4ff', 'left');
    text('（材料可用于强化 / 兑换铜钱）', 30, 526, 11, '#9ab', 'left');
    btn({ x: 15, y: 560, w: SW - 30, h: 48, label: '使用 1 个' });
  }
}
function renderFashion() {
  coverDraw('bg', 0, 0, SW, SH);
  ctx.fillStyle = 'rgba(10,22,40,0.6)'; ctx.fillRect(0, 0, SW, SH);
  renderAmbient('#ffe9a0');
  text('时装', SW / 2, 46, 22, '#ffd76a', 'center', true);
  btn({ x: 15, y: 16, w: 72, h: 36, label: '返回' });
  const cf = currentFashion();
  draw(cf.img, SW / 2 - 70, 60, 140, 248);
  text(cf.name + '（穿戴中）', SW / 2, 320, 14, '#e8c96a', 'center', true);
  const cw = 100, ch = 112, g = 10, ox = 22, oy = 344;
  FASHIONS.forEach((f, i) => {
    const px = ox + (i % 3) * (cw + g), py = oy + Math.floor(i / 3) * (ch + g);
    const sel = i === curFashion;
    panel(px, py, cw, ch, sel ? 'rgba(37,99,235,0.55)' : 'rgba(15,25,45,0.85)', 10);
    if (sel) { ctx.strokeStyle = 'rgba(255,213,90,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(px, py, cw, ch); }
    draw(f.img, px + cw / 2 - 30, py + 10, 60, 72);
    text(f.name, px + cw / 2, py + 92, 11, sel ? '#f7ecc8' : '#e0e0e0', 'center', true);
    text(sel ? '已穿戴' : '点击穿', px + cw / 2, py + 105, 9, sel ? '#4ade80' : '#9ab', 'center');
  });
}
// renderSettings / renderAchievements 已抽到 js/pages.js
function renderLogin() {
  coverDraw('bg', 0, 0, SW, SH);
  ctx.fillStyle = 'rgba(8,16,30,0.55)'; ctx.fillRect(0, 0, SW, SH);
  renderAmbient('#ffe9a0');
  btn({ x: 15, y: SAFE_TOP + 16, w: 72, h: 34, label: '📢 公告' });
  btn({ x: 93, y: SAFE_TOP + 16, w: 72, h: 34, label: '🎧 客服' });
  btn({ x: SW - 87, y: SAFE_TOP + 16, w: 72, h: 34, label: '⚙ 设置' });
  text(LOGIN.title, SW / 2, 210, 46, '#f7ecc8', 'center', true);
  text(LOGIN.subtitle, SW / 2, 244, 15, '#e8c96a', 'center');
  const s = LOGIN.servers[curServer];
  panel(SW / 2 - 140, 278, 280, 66, 'rgba(15,25,45,0.85)', 10);
  ctx.strokeStyle = 'rgba(200,162,75,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(SW / 2 - 140, 278, 280, 66);
  text('当前服务器', SW / 2 - 126, 300, 11, '#9ab', 'left');
  text(s.name + ' · ' + s.desc, SW / 2 - 126, 324, 16, '#f7ecc8', 'left', true);
  text('切换 ›', SW / 2 + 116, 312, 13, '#e8c96a', 'right');
  btn({ x: 40, y: 372, w: SW - 80, h: 54, label: '进 入 游 戏' });
  if (!loginAgreed) text('※ 请先勾选下方协议', SW / 2, 442, 12, '#f87171', 'center');
  const box = { x: 40, y: 462, w: 22, h: 22 };
  panel(box.x, box.y, box.w, box.h, loginAgreed ? 'rgba(200,162,75,0.95)' : 'rgba(15,25,45,0.9)', 4);
  ctx.strokeStyle = '#e8c96a'; ctx.lineWidth = 1.5; ctx.strokeRect(box.x, box.y, box.w, box.h);
  if (loginAgreed) text('✓', box.x + 11, box.y + 16, 15, '#3a2a10', 'center', true);
  text('我已阅读并同意', 70, box.y + 16, 13, '#e0e0e0', 'left');
  const ly = box.y + 40;
  text('《' + LOGIN.agreementUser + '》', 110, ly, 13, '#7cc4ff', 'left');
  text('《' + LOGIN.agreementPrivacy + '》', 215, ly, 13, '#7cc4ff', 'left');
  text('v1.0.0', SW / 2, SH - 30, 11, '#9ab', 'center');
}
function render() { if (scene === 'battle') renderBattle(); else if (scene === 'stages') renderStages(); else if (scene === 'equip') { renderEquip(); renderEquipDetail(); } else if (scene === 'pet') renderPet(); else if (scene === 'bag') renderBag(); else if (scene === 'fashion') renderFashion(); else if (scene === 'settings') renderSettings(); else if (scene === 'achievements') renderAchievements(); else if (scene === 'privacy') renderPrivacy(); else if (scene === 'login') renderLogin(); else renderHome(); if (fade < 1) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - fade) + ')'; ctx.fillRect(0, 0, SW, SH); } renderModal(); renderGuide(); }

function update(dt) {
  for (const p of ambient) { p.y -= p.sp * dt; p.x += Math.sin((p.y + p.ph) * 0.02) * 0.4; if (p.y < -10) { p.y = SH + 10; p.x = Math.random() * SW; } }
  fade = Math.min(1, fade + dt * 3);
  if (shake > 0) shake = Math.max(0, shake - dt * 10);
  if (arcLife > 0) arcLife = Math.max(0, arcLife - dt);
  if (flashHero > 0) flashHero -= dt;
  if (flashMonster > 0) flashMonster -= dt;
  if (flashPet > 0) flashPet -= dt;
  if (bossFlash > 0) bossFlash -= dt * 2;
  if (levelUpFlash > 0) levelUpFlash -= dt * 1.5;
  for (const p of particles) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.9; }
  particles = particles.filter(p => p.life < p.max);
  for (const s of slashes) s.life += dt;
  slashes = slashes.filter(s => s.life < s.max);
  if (scene !== 'battle' || !battle) return;
  battle.t += dt;
  if (!battle.done && battle.t > 0.4 + battle.pushed * (0.45 / battleSpeed) && battle.pushed < battle.res.actions.length) {
    const act = battle.res.actions[battle.pushed];
    const toMonster = act.atk !== 3;   // 我方攻击（1=主角 2=灵宠）
    const targetIsPet = act.tgt === 2; // 怪物打灵宠
    if (act.dodge) { battle.hits.push({ kind: 'dodge', x: toMonster ? -15 : 15, life: 0 }); sndDodge(); if (toMonster) combo = 0; }
    else if (act.heal > 0) { battle.hits.push({ kind: 'heal', v: act.heal, x: 0, life: 0 }); }
    else {
      battle.hits.push({ kind: 'dmg', v: act.dmg, x: toMonster ? -15 : 15, life: 0, crit: act.crit });
      if (toMonster) combo++; else combo = 0;
      act.crit ? sndCrit() : sndHit();
      const mcx2 = battle.stage && battle.stage.boss ? SW - 95 : SW - 99;
      const fx = toMonster ? (act.atk === 2 ? 168 : 99) : mcx2;
      const tx = toMonster ? mcx2 : (targetIsPet ? 168 : 99);
      slashes.push({ x: fx, y: GROUND - 130, dx: tx - fx, life: 0, max: 0.2, crit: act.crit });
      spawn(tx, GROUND - 90, act.crit ? '#ffcc33' : '#ff6a00');
      if (toMonster) flashMonster = 0.22; else if (targetIsPet) flashPet = 0.22; else flashHero = 0.22;
      if (!toMonster && battle.stage && battle.stage.boss) { bossFlash = 0.5; shake = 14; } else shake = act.crit ? 12 : 7;
      arcLife = 0.35;
    }
    battle.pushed++;
  }
  for (const h of battle.hits) h.life += dt * 0.6;
  battle.hits = battle.hits.filter(h => h.life < 1);
  if (!battle.done && battle.pushed >= battle.res.actions.length && battle.t > 0.4 + battle.pushed * (0.45 / battleSpeed) + 0.5) { battle.done = true; battle.doneTime = battle.t; if (battle.res.win) { sndVictory(); sndDrop(); spawn(SW - 99, GROUND - 100, '#9fd8ff', 40); } }
}

// ===== 触摸 =====
const mainActions = { '战斗': doStages, '领收益': doClaim, '装备': doEquip, '灵宠': doPet, '背包': doBag, '邮件': doMail, '排行': doRank, '设置': doSettings };
async function doSettings() { scene = 'settings'; fade = 0; }
async function doAchievements() { await fetchEquip(); await fetchPet(); scene = 'achievements'; fade = 0; }
function doLogout() {
  showModal('退出登录', ['确定要退出登录吗？', '退出后需重新同意协议并登录。'], [
    { label: '取消', fn: closeModal },
    { label: '退出', fn: confirmLogout },
  ]);
}
function confirmLogout() {
  closeModal();
  try {
    wx.removeStorageSync(PRIVACY_KEY); wx.removeStorageSync(GUIDE_KEY); wx.removeStorageSync(STAGE_KEY);
    wx.removeStorageSync('cxwd_sound'); wx.removeStorageSync('cxwd_bgm');
  } catch (e) {}
  privacyAgreed = false; tutorialDone = false; stageProgress = { cleared: [], stars: {} }; guide = null; welcomed = false;
  nickname = ''; level = 0; exp = 0; copper = 0; power = 0;
  equipData = []; petData = []; mailData = []; bagItems = []; selIdx = 0; selEquip = null; equipPopup = null;
  if (ws) { try { ws.close({ fail: () => {} }); } catch (e) {} }
  connected = false;
  loginAgreed = false;
  scene = 'login'; fade = 0;
  addLog('已退出登录');
}
function doShare() {
  wx.shareAppMessage({
    title: '《尘霄问道》仙侠挂机，一起修炼！',
    imageUrl: 'images/hero_male.png',
    success: () => { sndUpgrade(); addLog('分享成功，感谢支持'); },
    fail: () => { addLog('分享已取消'); }
  });
}
function showAgreementModal(type) {
  const lines = type === 'user' ? AGREEMENT_USER : AGREEMENT_PRIVACY;
  showModal(type === 'user' ? LOGIN.agreementUser : LOGIN.agreementPrivacy, lines, [{ label: '关闭', fn: closeModal }]);
}
function showServers() {
  const lines = LOGIN.servers.map((s, i) => (i === curServer ? '● ' : '○ ') + s.name + '（' + s.desc + '）');
  const btns = LOGIN.servers.map((s, i) => ({ label: s.name, fn: () => { curServer = i; closeModal(); } }));
  btns.push({ label: '关闭', fn: closeModal });
  showModal('选择服务器', lines, btns);
}
function showNotice() { showModal('公告', [LOGIN.notice], [{ label: '关闭', fn: closeModal }]); }
function showCustomer() { showModal('客服', [LOGIN.customer, '遇到问题请通过上述方式反馈。'], [{ label: '关闭', fn: closeModal }]); }
function doEnterGame() {
  if (!loginAgreed) { sndError(); addLog('请先勾选协议'); return; }
  privacyAgreed = true;
  try { wx.setStorageSync(PRIVACY_KEY, 1); } catch (e) {}
  connect();
  scene = 'home'; fade = 0;
}
function initRewardedAd() {
  if (AD_UNIT_ID && !rewardedAd) {
    try {
      rewardedAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID });
      rewardedAd.onClose((res) => { if (res && res.isEnded) reportAd(); });
    } catch (e) { rewardedAd = null; }
  }
}
async function doAd() {
  const [, body] = await send(9000, [0x08, 0x04]); // scene=4 翻倍
  let bizId = '';
  for (const f of p(body)) if (f.n === 2) bizId = bytesToStr(f.d);
  if (!bizId) { addLog('广告请求失败'); return; }
  adBizId = bizId;
  initRewardedAd();
  if (!rewardedAd) { reportAd(); return; }
  rewardedAd.show().catch(() => { rewardedAd.load().then(() => rewardedAd.show()).catch(() => reportAd()); });
}
async function reportAd() {
  if (!adBizId) return;
  const b = utf8(adBizId);
  await send(9002, [0x0A, b.length].concat(b));
  sndDrop();
  addLog('广告奖励：铜钱 +500');
  adBizId = '';
  await doLogin();
}
wx.onTouchStart((e) => {
  startBGM();
  const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
  const x = t ? (t.clientX !== undefined ? t.clientX : t.x) : 0;
  const y = t ? (t.clientY !== undefined ? t.clientY : t.y) : 0;
  if (modal) {
    const mw = SW - 50, mh = Math.min(SH - 200, 400), mx = 25, my = 130;
    const L = modalButtonLayout();
    let bx = L.bx0;
    for (const b of modal.buttons) { if (x >= bx && x <= bx + L.bw && y >= L.by && y <= L.by + L.bh) { sndClick(); b.fn(); return; } bx += L.bw + L.gap; }
    if (x < mx || x > mx + mw || y < my || y > my + mh) closeModal();
    return;
  }
  if (scene === 'login') {
    if (x >= 15 && x <= 87 && y >= SAFE_TOP + 16 && y <= SAFE_TOP + 50) { sndClick(); showNotice(); return; }
    if (x >= 93 && x <= 165 && y >= SAFE_TOP + 16 && y <= SAFE_TOP + 50) { sndClick(); showCustomer(); return; }
    if (x >= SW - 87 && x <= SW - 15 && y >= SAFE_TOP + 16 && y <= SAFE_TOP + 50) { sndClick(); scene = 'settings'; fade = 0; return; }
    if (x >= SW / 2 - 140 && x <= SW / 2 + 140 && y >= 278 && y <= 344) { sndClick(); showServers(); return; }
    if (x >= 40 && x <= SW - 40 && y >= 372 && y <= 426) { sndClick(); doEnterGame(); return; }
    if (x >= 40 && x <= 62 && y >= 462 && y <= 484) { sndClick(); loginAgreed = !loginAgreed; return; }
    if (y >= 502 && y <= 520 && x >= 110 && x <= 200) { sndClick(); showAgreementModal('user'); return; }
    if (y >= 502 && y <= 520 && x >= 215 && x <= 300) { sndClick(); showAgreementModal('privacy'); return; }
    return;
  }
  if (scene === 'privacy') {
    if (y >= SH - 152 && y <= SH - 102) { sndClick(); privacyAgreed = true; try { wx.setStorageSync(PRIVACY_KEY, 1); } catch (e2) {} connect(); scene = 'home'; fade = 0; return; }
    if (y >= SH - 92 && y <= SH - 52) { sndClick(); showModal('提示', ['需同意协议后才能进入游戏'], [{ label: '知道了', fn: closeModal }]); return; }
    return;
  }
  if (scene === 'home' && !modal && !guide && x >= SW / 2 - 95 && x <= SW / 2 + 95 && y >= 80 && y <= 405) { heroAngle = x < SW / 2 ? -0.7 : 0.7; sndClick(); return; }
  if (guide && scene === 'home' && !modal) {
    if (guide.phase === 'intro') {
      if (x >= SW / 2 - 62 && x <= SW / 2 + 62 && y >= 396 && y <= 440) { sndClick(); guide = { phase: 'battle' }; }
      return;
    }
    if (guide.phase === 'fighting') return;
    if (guide.phase === 'attr') {
      if (x >= SW / 2 - 70 && x <= SW / 2 + 70 && y >= 428 && y <= 456) { sndClick(); guide = null; tutorialDone = true; try { wx.setStorageSync(GUIDE_KEY, 1); } catch (e2) {} showAttrs(); }
      return;
    }
    const label = guide.phase === 'battle' ? '战斗' : guide.phase === 'claim' ? '领收益' : '装备';
    const target = buttons.find(b => b.label === label);
    if (target && x >= target.x && x <= target.x + target.w && y >= target.y && y <= target.y + target.h) {
      sndClick();
      if (guide.phase === 'battle') { guide = { phase: 'fighting' }; doBattle(1001, 1); }
      else if (guide.phase === 'claim') { guide = { phase: 'equip' }; doClaim(); }
      else if (guide.phase === 'equip') { guide = { phase: 'attr' }; doEquip(); }
    }
    return;
  }
  if (scene === 'stages') {
    if (x >= 15 && x <= 105 && y >= SH - 60 && y <= SH - 16) { sndClick(); scene = 'home'; fade = 0; return; }
    STAGES.forEach((s, i) => {
      const cy = 108 + i * 122, ch = 108;
      if (x >= 20 && x <= SW - 20 && y >= cy && y <= cy + ch) {
        const cleared = stageProgress.cleared.indexOf(s.id) >= 0;
        if (cleared && x >= SW - 98 && x <= SW - 36 && y >= cy + 44 && y <= cy + 74) { sndClick(); doSweep(s.id, s.type); return; }
        if (!stageUnlocked(s)) { addLog('需先通关「' + STAGES[i - 1].name + '」'); sndClick(); return; }
        sndClick(); doBattle(s.id, s.type);
      }
    });
    return;
  }
  if (scene === 'equip') {
    if (equipPopup) {
      const mx = 30, my = 140, mw = SW - 60;
      if (y >= my + 200 && y <= my + 240) {
        if (x >= mx + 14 && x <= mx + 108) { sndClick(); wearSelected(); return; }
        if (x >= mx + 116 && x <= mx + 210) { sndClick(); strengthen(); return; }
        if (x >= mx + 218 && x <= mx + 316) { sndClick(); refine(); return; }
      }
      if (y >= my + 248 && y <= my + 288) {
        if (x >= mx + 14 && x <= mx + 168) { sndClick(); decompose(); return; }
        if (x >= mx + 176 && x <= mx + 316) { sndClick(); equipPopup = null; return; }
      }
      if (x < mx || x > mx + mw || y < my || y > my + 330) { equipPopup = null; return; }
      return;
    }
    if (x >= 15 && x <= 87 && y >= 16 && y <= 52) { sndClick(); scene = 'home'; fade = 0; return; }
    if (x >= SW - 87 && x <= SW - 15 && y >= 16 && y <= 52) { sndClick(); scene = 'fashion'; fade = 0; return; }
    // 已穿戴槽位点击 → 选中展示属性
    const cw = 82, ch = 68, gx = 6, gy = 6, ox = 15, oy = 60;
    for (let i = 0; i < 8; i++) {
      const px = ox + (i % 4) * (cw + gx), py = oy + Math.floor(i / 4) * (ch + gy);
      if (x >= px && x <= px + cw && y >= py && y <= py + ch) {
        const eq = equipData.find(q => q.pos === POS_LIST[i]);
        if (eq) { sndClick(); selEquip = eq; equipPopup = eq; return; }
      }
    }
    const bag = equipData.filter(q => !q.pos);
    const ly = 234, lh = 36, lg = 3;
    for (let i = 0; i < Math.min(6, bag.length); i++) {
      const py = ly + i * (lh + lg);
      if (x >= 15 && x <= SW - 15 && y >= py && y <= py + lh) { sndClick(); selIdx = i; selEquip = bag[i]; equipPopup = bag[i]; return; }
    }
    const sel = selectedEquip();
    if (sel) {
      const wornSame = !sel.pos ? equipData.find(q => q.pos === EQUIP_POS[sel.id]) : null;
      const by = wornSame ? 600 : 574;
      if (y >= by && y <= by + 44) {
        if (x >= 15 && x <= 123) { sndClick(); wearSelected(); return; }
        if (x >= 131 && x <= 239) { sndClick(); strengthen(); return; }
        if (x >= 247 && x <= 375) { sndClick(); refine(); return; }
      }
      if (y >= by + 52 && y <= by + 94) {
        if (x >= 15 && x <= 191) { sndClick(); decompose(); return; }
        if (x >= 199 && x <= 375) { sndClick(); autoWear(); return; }
      }
    } else if (y >= 480 && y <= 524 && x >= 15 && x <= SW - 15) { sndClick(); autoWear(); return; }
    return;
  }
  if (scene === 'pet') {
    if (x >= 15 && x <= 87 && y >= 16 && y <= 52) { sndClick(); scene = 'home'; fade = 0; return; }
    const ly = 70, lh = 60, lg = 6;
    for (let i = 0; i < Math.min(4, petData.length); i++) {
      const py = ly + i * (lh + lg);
      if (x >= 15 && x <= SW - 15 && y >= py && y <= py + lh) { sndClick(); selIdx = i; return; }
    }
    const sel = petData[selIdx];
    if (sel && y >= 486 && y <= 530) {
      if (x >= 15 && x <= 123) { sndClick(); setCombat(); return; }
      if (x >= 131 && x <= 239) { sndClick(); upgradePet(); return; }
      if (x >= 247 && x <= 375) { sndClick(); evolvePet(); return; }
    }
    return;
  }
  if (scene === 'bag') {
    if (x >= 15 && x <= 87 && y >= 16 && y <= 52) { sndClick(); scene = 'home'; fade = 0; return; }
    const cw = 82, ch = 82, g = 6, ox = 15, oy = 70;
    for (let i = 0; i < bagItems.length; i++) {
      const px = ox + (i % 4) * (cw + g), py = oy + Math.floor(i / 4) * (ch + g);
      if (x >= px && x <= px + cw && y >= py && y <= py + ch) { sndClick(); selIdx = i; return; }
    }
    if (bagItems[selIdx] && y >= 560 && y <= 608 && x >= 15 && x <= SW - 15) { sndClick(); useItem(); return; }
    return;
  }
  if (scene === 'fashion') {
    if (x >= 15 && x <= 87 && y >= 16 && y <= 52) { sndClick(); scene = 'home'; fade = 0; return; }
    const cw = 100, ch = 112, g = 10, ox = 22, oy = 344;
    FASHIONS.forEach((f, i) => {
      const px = ox + (i % 3) * (cw + g), py = oy + Math.floor(i / 3) * (ch + g);
      if (x >= px && x <= px + cw && y >= py && y <= py + ch) { sndClick(); curFashion = i; try { wx.setStorageSync('cxwd_fashion', i); } catch (e2) {} sndUpgrade(); return; }
    });
    return;
  }
  if (scene === 'settings') {
    if (x >= 15 && x <= 87 && y >= 16 && y <= 52) { sndClick(); scene = privacyAgreed ? 'home' : 'login'; fade = 0; return; }
    if (x >= 15 && x <= SW - 15 && y >= 70 && y <= 126) { audio.setSoundOn(!audio.getSoundOn()); sndClick(); return; }
    if (x >= 15 && x <= SW - 15 && y >= 134 && y <= 190) { audio.setBgmOn(!audio.getBgmOn()); sndClick(); return; }
    if (x >= 15 && x <= SW - 15 && y >= 210 && y <= 258) { sndClick(); privacyAgreed = false; loginAgreed = false; tutorialDone = false; stageProgress = { cleared: [], stars: {} }; guide = null; try { wx.removeStorageSync(PRIVACY_KEY); wx.removeStorageSync(GUIDE_KEY); wx.removeStorageSync(STAGE_KEY); } catch (e2) {} scene = 'login'; fade = 0; return; }
    if (x >= 15 && x <= SW - 15 && y >= 268 && y <= 316) { sndClick(); showModal('用户协议与隐私政策', ['本游戏收集 OpenID、昵称、游戏数据用于提供服务，', '不收集敏感信息、不出售个人信息，', '无充值内购仅广告变现，未成年人受防沉迷保护。'], [{ label: '关闭', fn: closeModal }]); return; }
    if (x >= 15 && x <= SW - 15 && y >= 326 && y <= 374) { sndClick(); doShare(); return; }
    if (x >= 15 && x <= SW - 15 && y >= 384 && y <= 432) { sndClick(); doAchievements(); return; }
    if (x >= 15 && x <= SW - 15 && y >= 442 && y <= 490) { sndClick(); doLogout(); return; }
    return;
  }
  if (scene === 'achievements') {
    if (x >= 15 && x <= 87 && y >= 16 && y <= 52) { sndClick(); scene = 'home'; fade = 0; return; }
    return;
  }
  if (scene === 'battle') {
    if (!battle.done && x >= SW - 162 && x <= SW - 92 && y >= 16 && y <= 50) { skipBattle(); return; }
    if (x >= SW - 84 && x <= SW - 14 && y >= 16 && y <= 50) { sndClick(); battleSpeed = battleSpeed === 1 ? 2 : 1; return; }
    if (battle && battle.done && battle.t > (battle.doneTime || 0) + 0.4) {
      const by = SH - 90;
      if (x >= 30 && x <= 186 && y >= by && y <= by + 40) { sndClick(); doBattle(battle.stage.id, battle.stage.type); return; }
      if (x >= 204 && x <= 360 && y >= by && y <= by + 40) { sndClick(); scene = 'home'; fade = 0; battle = null; if (guide && guide.phase === 'fighting') guide = { phase: 'claim' }; }
    }
    return;
  }
  if (scene === 'home' && x >= SW / 2 - 70 && x <= SW / 2 + 70 && y >= 428 && y <= 456) { sndClick(); showAttrs(); return; }
  if (scene === 'home' && x >= 28 && x <= 150 && y >= 550 && y <= 576) { sndClick(); doAd(); return; }
  for (const b of buttons) { if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { sndClick(); if (mainActions[b.label]) mainActions[b.label](); return; } }
});

// ===== 主循环 =====
let lastT = Date.now();
function loop() {
  if (!sysInfoReady) {
    try { const si = wx.getSystemInfoSync(); applySystemInfo(si); canvas.width = SW * DPR; canvas.height = SH * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); GROUND = Math.round(SH * 0.57); sysInfoReady = true; } catch (e) {}
  }
  const now = Date.now(); update((now - lastT) / 1000); lastT = now; render(); requestAnimationFrame(loop);
}

// 启动
layout(); initAudio();
if (!privacyAgreed) { scene = 'login'; } else { connect(); }
loop();
