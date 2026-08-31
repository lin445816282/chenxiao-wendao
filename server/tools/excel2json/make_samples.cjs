#!/usr/bin/env node
'use strict';
// 生成示例 Excel（演示表头与复杂字段的填写约定）
// 用法：node make_samples.cjs

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_DIR = path.resolve(__dirname, '..', '..', 'excel');

const SAMPLES = [
  {
    file: 'stage.xlsx', sheet: 'stage',
    header: ['id', 'type', 'name', 'recommend_power', 'monster_ids', 'boss_id', 'exp_reward', 'copper_reward', 'drop_table_id', 'unlock_prev_stage'],
    rows: [
      [1001, 1, '尘息小径', 500, '101,102', 0, 100, 200, 1, 0],
      [1002, 1, '霄影林', 800, '103,104', 0, 150, 300, 1, 1001],
      [2001, 2, '玄灵试炼', 2000, '201', 201, 500, 800, 2, 1002],
      [3001, 3, '血魔渊', 5000, '301', 301, 2000, 3000, 3, 2001],
    ],
  },
  {
    file: 'equip.xlsx', sheet: 'equip',
    header: ['id', 'name', 'pos', 'quality', 'base_attrs', 'affix_pool', 'max_strengthen', 'max_refine'],
    rows: [
      [2001, '青锋剑', 1, 1, '1:100', '101,102', 50, 10],
      [2002, '流云法衣', 3, 2, '3:150', '103,104', 50, 10],
    ],
  },
  {
    file: 'pet.xlsx', sheet: 'pet',
    header: ['id', 'name', 'rarity', 'base_attrs', 'skills'],
    rows: [
      [3001, '雪灵狐', 5, '1:80', '4001:10'],
      [3002, '玄龟幼兽', 4, '3:120', '4002:10'],
    ],
  },
  {
    file: 'drop.xlsx', sheet: 'drop',
    header: ['id', 'entries'],
    rows: [
      [1, '2001:100:1:1;5001:50:1:3'],
      [2, '2002:100:1:1'],
      [3, '2002:100:1:1;3001:5:1:1'],
    ],
  },
  {
    file: 'hang.xlsx', sheet: 'hang',
    header: ['max_offline_seconds', 'exp_per_second', 'copper_per_second', 'ad_multiplier'],
    rows: [[86400, 2, 5, 2]],
  },
];

function main() {
  fs.mkdirSync(EXCEL_DIR, { recursive: true });
  for (const s of SAMPLES) {
    const aoa = [s.header, ...s.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, s.sheet);
    const p = path.join(EXCEL_DIR, s.file);
    XLSX.writeFile(wb, p);
    console.log('生成', p);
  }
}

main();
