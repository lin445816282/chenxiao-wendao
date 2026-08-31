#!/usr/bin/env node
// 生成 10 阶（每 10 级一阶，上限 100 级）的关卡/灵宠/装备/掉落/等级段配置。
// 用法：node gen_tier_configs.cjs  （在当前目录生成 stage.json/pet.json/equip.json/drop.json/level.json）
'use strict';
const fs = require('fs');

// 每一阶：关卡(1) + 灵宠(1) + 装备(武器+衣服 2) + 掉落表(1)
const tiers = [
  { b: 1, lvMin: 1, lvMax: 10, realm: '炼气期',
    stage: { id: 1001, type: 1, name: '尘息小径', power: 400, monsters: [101, 102], exp: 100, copper: 200 },
    pet: { id: 3001, name: '雪灵狐', rarity: 3, attr: 1, val: 80 },
    weapon: { id: 2001, name: '青锋剑', q: 1, atk: 100 }, armor: { id: 2002, name: '流云法衣', q: 2, hp: 150 } },
  { b: 2, lvMin: 11, lvMax: 20, realm: '筑基期',
    stage: { id: 1002, type: 1, name: '霄影林', power: 700, monsters: [103, 104], exp: 160, copper: 320 },
    pet: { id: 3002, name: '玄龟幼兽', rarity: 3, attr: 3, val: 120 },
    weapon: { id: 2003, name: '灵木杖', q: 2, atk: 200 }, armor: { id: 2004, name: '云纹道袍', q: 2, hp: 300 } },
  { b: 3, lvMin: 21, lvMax: 30, realm: '金丹期',
    stage: { id: 1003, type: 2, name: '落星谷', power: 1200, monsters: [201], exp: 260, copper: 520 },
    pet: { id: 3003, name: '赤炎狮', rarity: 4, attr: 1, val: 200 },
    weapon: { id: 2005, name: '星陨剑', q: 2, atk: 320 }, armor: { id: 2006, name: '星罗法衣', q: 3, hp: 480 } },
  { b: 4, lvMin: 31, lvMax: 40, realm: '元婴期',
    stage: { id: 1004, type: 2, name: '寒潭洞', power: 2000, monsters: [202], exp: 420, copper: 840 },
    pet: { id: 3004, name: '冰魄蝉', rarity: 4, attr: 1, val: 320 },
    weapon: { id: 2007, name: '寒霜剑', q: 3, atk: 500 }, armor: { id: 2008, name: '冰蚕宝甲', q: 3, hp: 750 } },
  { b: 5, lvMin: 41, lvMax: 50, realm: '化神期',
    stage: { id: 1005, type: 2, name: '雷音寺', power: 3200, monsters: [203], exp: 680, copper: 1360 },
    pet: { id: 3005, name: '雷纹鹤', rarity: 4, attr: 1, val: 500 },
    weapon: { id: 2009, name: '紫电剑', q: 3, atk: 780 }, armor: { id: 2010, name: '雷纹战甲', q: 4, hp: 1170 } },
  { b: 6, lvMin: 51, lvMax: 60, realm: '炼虚期',
    stage: { id: 1006, type: 3, name: '万妖窟', power: 4800, monsters: [301], exp: 1100, copper: 2200 },
    pet: { id: 3006, name: '九幽蟒', rarity: 5, attr: 1, val: 780 },
    weapon: { id: 2011, name: '妖皇戟', q: 4, atk: 1200 }, armor: { id: 2012, name: '万妖袍', q: 4, hp: 1800 } },
  { b: 7, lvMin: 61, lvMax: 70, realm: '合体期',
    stage: { id: 1007, type: 3, name: '幽冥渊', power: 7000, monsters: [302], exp: 1800, copper: 3600 },
    pet: { id: 3007, name: '火羽凤', rarity: 5, attr: 1, val: 1200 },
    weapon: { id: 2013, name: '幽冥刃', q: 4, atk: 1800 }, armor: { id: 2014, name: '幽冥法袍', q: 5, hp: 2700 } },
  { b: 8, lvMin: 71, lvMax: 80, realm: '大乘期',
    stage: { id: 1008, type: 3, name: '天火崖', power: 10000, monsters: [303], exp: 2900, copper: 5800 },
    pet: { id: 3008, name: '青鸾', rarity: 5, attr: 3, val: 2200 },
    weapon: { id: 2015, name: '焚天剑', q: 5, atk: 2600 }, armor: { id: 2016, name: '天火战衣', q: 5, hp: 3900 } },
  { b: 9, lvMin: 81, lvMax: 90, realm: '渡劫期',
    stage: { id: 1009, type: 3, name: '昆仑墟', power: 14000, monsters: [304], exp: 4700, copper: 9400 },
    pet: { id: 3009, name: '玄冰麒麟', rarity: 6, attr: 3, val: 3600 },
    weapon: { id: 2017, name: '昆仑神剑', q: 5, atk: 3700 }, armor: { id: 2018, name: '昆仑仙袍', q: 5, hp: 5600 } },
  { b: 10, lvMin: 91, lvMax: 100, realm: '真仙境',
    stage: { id: 1010, type: 3, name: '仙帝宫', power: 20000, monsters: [305], exp: 7600, copper: 15000 },
    pet: { id: 3010, name: '混沌神龙', rarity: 6, attr: 1, val: 5600 },
    weapon: { id: 2019, name: '混沌帝剑', q: 5, atk: 5200 }, armor: { id: 2020, name: '混沌帝袍', q: 5, hp: 7800 } },
];

const stages = [], pets = [], equips = [], drops = [], levels = [];
for (const t of tiers) {
  const st = t.stage, pet = t.pet, w = t.weapon, a = t.armor;
  stages.push({
    id: st.id, type: st.type, name: st.name,
    recommend_power: st.power, monster_ids: st.monsters, boss_id: st.type >= 3 ? st.monsters[0] : 0,
    exp_reward: st.exp, copper_reward: st.copper, drop_table_id: t.b, unlock_level: t.lvMin,
  });
  pets.push({
    id: pet.id, name: pet.name, rarity: pet.rarity,
    base_attrs: [{ attr_id: pet.attr, value: pet.val }],
    skills: [{ skill_id: 4000 + t.b, max_level: 10 }],
    unlock_level: t.lvMin,
  });
  equips.push({ id: w.id, name: w.name, pos: 1, quality: w.q, base_attrs: [{ attr_id: 1, value: w.atk }], affix_pool: [101, 102], max_strengthen: 50, max_refine: 10, unlock_level: t.lvMin });
  equips.push({ id: a.id, name: a.name, pos: 3, quality: a.q, base_attrs: [{ attr_id: 3, value: a.hp }], affix_pool: [103, 104], max_strengthen: 50, max_refine: 10, unlock_level: t.lvMin });
  const entries = [
    { item_id: w.id, weight: 100, count_min: 1, count_max: 1 },
    { item_id: a.id, weight: 100, count_min: 1, count_max: 1 },
    { item_id: 5001, weight: 40, count_min: 1, count_max: 3 },
  ];
  if (t.b >= 3) entries.push({ item_id: pet.id, weight: 8, count_min: 1, count_max: 1 }); // 三阶起低概率掉落灵宠
  drops.push({ id: t.b, entries });
  levels.push({ band: t.b, level_min: t.lvMin, level_max: t.lvMax, realm: t.realm, stage_ids: [st.id], pet_ids: [pet.id], equip_ids: [w.id, a.id] });
}

fs.writeFileSync('stage.json', JSON.stringify(stages, null, 2) + '\n');
fs.writeFileSync('pet.json', JSON.stringify(pets, null, 2) + '\n');
fs.writeFileSync('equip.json', JSON.stringify(equips, null, 2) + '\n');
fs.writeFileSync('drop.json', JSON.stringify(drops, null, 2) + '\n');
fs.writeFileSync('level.json', JSON.stringify(levels, null, 2) + '\n');
console.log(`生成完成：stages=${stages.length} pets=${pets.length} equips=${equips.length} drops=${drops.length} levels=${levels.length}`);
