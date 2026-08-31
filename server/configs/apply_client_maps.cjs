// 把 gen_tier_configs.cjs 生成的 client_maps.txt 写入 game.js（替换装备 map 常量并插入 POS_ICON）。
'use strict';
const fs = require('fs');
const path = require('path');

const gamePath = path.join(__dirname, '../../client/wx-minigame-smoke/game.js');
const mapsPath = path.join(__dirname, 'client_maps.txt');

let game = fs.readFileSync(gamePath, 'utf8');
const maps = fs.readFileSync(mapsPath, 'utf8').trim().split('\n');

const names = ['EQUIP_NAME', 'EQUIP_POS', 'EQUIP_BASE', 'EQUIP_QUALITY'];
for (let i = 0; i < names.length; i++) {
  const re = new RegExp('const ' + names[i] + ' = \\{[^\\n]*\\};[^\\n]*');
  if (!re.test(game)) { console.error('NOT FOUND: ' + names[i]); process.exit(1); }
  game = game.replace(re, maps[i].replace(/;$/, '') + ';');
}

const posIcon = "const POS_ICON = { 1: '⚔️', 2: '🪖', 3: '👘', 4: '👖', 5: '👟', 6: '📿', 7: '💍', 8: '🔮' };";
if (!game.includes('POS_ICON')) {
  game = game.replace("const POS_NAME = { 1: '武器'", posIcon + "\nconst POS_NAME = { 1: '武器'");
}

fs.writeFileSync(gamePath, game);
console.log('OK: maps replaced + POS_ICON inserted');
