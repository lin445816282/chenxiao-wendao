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

module.exports = {
  STAGES, ACHIEVEMENTS, EQUIP_NAME, EQUIP_POS, POS_NAME, EQUIP_BASE, AFFIX_ATTR, POS_LIST,
  EQUIP_QUALITY, QUALITY_COLOR, QUALITY_NAME, PET_NAME, PET_BASE, ITEM_NAME, ITEM_ICON,
  LOGIN, AGREEMENT_USER, AGREEMENT_PRIVACY, FASHIONS,
  equipColor, equipQualityName, calcPetAttrs,
};
