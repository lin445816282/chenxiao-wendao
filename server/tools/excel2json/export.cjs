#!/usr/bin/env node
'use strict';
// Excel -> JSON 导表工具
// 读取 server/excel/*.xlsx，按 SCHEMA 定义解析，输出 server/configs/*.json
// 用法：node export.cjs

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..'); // server/
const EXCEL_DIR = path.join(ROOT, 'excel');
const OUT_DIR = path.join(ROOT, 'configs');

// ============================================================
// 表结构定义
// mode: array（多行 -> JSON 数组）| object（单行 -> JSON 对象）
// 列类型约定见 parseValue
// ============================================================
const SCHEMA = [
  {
    table: 'stage', excel: 'stage.xlsx', sheet: 'stage', output: 'stage.json', mode: 'array',
    columns: [
      ['id', 'int'], ['type', 'int'], ['name', 'string'], ['recommend_power', 'int'],
      ['monster_ids', 'int[]'], ['boss_id', 'int'], ['exp_reward', 'int'],
      ['copper_reward', 'int'], ['drop_table_id', 'int'], ['unlock_prev_stage', 'int'],
    ],
  },
  {
    table: 'equip', excel: 'equip.xlsx', sheet: 'equip', output: 'equip.json', mode: 'array',
    columns: [
      ['id', 'int'], ['name', 'string'], ['pos', 'int'], ['quality', 'int'],
      ['base_attrs', 'attr[]'], ['affix_pool', 'int[]'],
      ['max_strengthen', 'int'], ['max_refine', 'int'],
    ],
  },
  {
    table: 'pet', excel: 'pet.xlsx', sheet: 'pet', output: 'pet.json', mode: 'array',
    columns: [
      ['id', 'int'], ['name', 'string'], ['rarity', 'int'],
      ['base_attrs', 'attr[]'], ['skills', 'skill[]'],
    ],
  },
  {
    table: 'drop', excel: 'drop.xlsx', sheet: 'drop', output: 'drop.json', mode: 'array',
    columns: [
      ['id', 'int'], ['entries', 'drop[]'],
    ],
  },
  {
    table: 'hang', excel: 'hang.xlsx', sheet: 'hang', output: 'hang.json', mode: 'object',
    columns: [
      ['max_offline_seconds', 'int'], ['exp_per_second', 'int'],
      ['copper_per_second', 'int'], ['ad_multiplier', 'int'],
    ],
  },
];

// 各类型的默认值
function defaultFor(type) {
  if (type.endsWith('[]')) return [];
  if (type === 'int') return 0;
  return '';
}

// 按列类型解析单元格
//   int      数值
//   string   字符串
//   int[]    逗号分隔整数，如 "101,102"
//   attr[]   "属性id:数值" 逗号分隔，如 "1:100,3:150"
//   skill[]  "技能id:满级" 逗号分隔，如 "4001:10,4002:10"
//   drop[]   "物品id:权重:最小:最大" 分号分隔，如 "2001:100:1:1;5001:50:1:3"
function parseValue(type, raw) {
  if (raw === undefined || raw === null || raw === '') return defaultFor(type);
  const s = String(raw).trim();
  switch (type) {
    case 'int':
      return Math.trunc(Number(s));
    case 'string':
      return s;
    case 'int[]':
      return s.split(/[,，;；]/).map((x) => x.trim()).filter(Boolean).map(Number);
    case 'attr[]':
      return s.split(/[,，]/).map((seg) => {
        const [a, v] = seg.split(':').map(Number);
        return { attr_id: a, value: v };
      });
    case 'skill[]':
      return s.split(/[,，]/).map((seg) => {
        const [a, v] = seg.split(':').map(Number);
        return { skill_id: a, max_level: v };
      });
    case 'drop[]':
      return s.split(/[;；]/).map((seg) => {
        const [item_id, weight, count_min, count_max] = seg.split(':').map(Number);
        return { item_id, weight, count_min, count_max };
      });
    default:
      return s;
  }
}

function convert(schema) {
  const excelPath = path.join(EXCEL_DIR, schema.excel);
  if (!fs.existsSync(excelPath)) {
    console.error(`[跳过] ${schema.table}: 找不到 ${excelPath}`);
    return;
  }
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets[schema.sheet];
  if (!ws) {
    console.error(`[跳过] ${schema.table}: 找不到 sheet "${schema.sheet}"`);
    return;
  }
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rows.length === 0) {
    console.error(`[跳过] ${schema.table}: 空表`);
    return;
  }
  const header = rows[0].map((h) => String(h).trim());
  const colIdx = {};
  header.forEach((h, i) => { colIdx[h] = i; });

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    for (const [colName, type] of schema.columns) {
      const idx = colIdx[colName];
      obj[colName] = parseValue(type, idx === undefined ? '' : row[idx]);
    }
    records.push(obj);
  }

  const out = schema.mode === 'object' ? (records[0] || {}) : records;
  const outPath = path.join(OUT_DIR, schema.output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`[OK] ${schema.table}: ${records.length} 行 -> ${schema.output}`);
}

function main() {
  for (const s of SCHEMA) convert(s);
  console.log('导表完成。');
}

main();
