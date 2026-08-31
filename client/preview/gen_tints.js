// 运行时生成换色变体：用 Chromium 画布 hue-rotate 滤镜，保留细节地改色。
// 产物写入 client/wx-minigame-smoke/images/，供时装/怪物/灵宠多套使用。
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CHROME = '/home/xiaolin/projects/dsh/chenxiao-wendao/client/preview/chrome/chrome-linux64/chrome';
const IMG_DIR = '/home/xiaolin/projects/dsh/chenxiao-wendao/client/wx-minigame-smoke/images';

// [源图, 输出图, hue-rotate 角度]
const JOBS = [
  // 时装（男/女各 3 套新色）
  ['hero_male.png', 'hero_purple.png', 280],
  ['hero_male.png', 'hero_teal.png', 160],
  ['hero_male.png', 'hero_orange.png', 30],
  ['hero_female.png', 'hero_pink.png', 300],
  ['hero_female.png', 'hero_violet.png', 250],
  ['hero_female.png', 'hero_cyan.png', 180],
  // 怪物（基础怪 4 色 + BOSS 2 色）
  ['monster_basic.png', 'monster_fire.png', 340],
  ['monster_basic.png', 'monster_ice.png', 200],
  ['monster_basic.png', 'monster_shadow.png', 260],
  ['monster_basic.png', 'monster_gold.png', 45],
  ['boss.png', 'boss_fire.png', 340],
  ['boss.png', 'boss_shadow.png', 260],
  // 灵宠（狐 4 色 + 龟 3 色）
  ['pet_linghu.png', 'pet_fire.png', 340],
  ['pet_linghu.png', 'pet_ice.png', 200],
  ['pet_linghu.png', 'pet_gold.png', 45],
  ['pet_linghu.png', 'pet_shadow.png', 260],
  ['pet_xuanwu.png', 'pet_blood.png', 340],
  ['pet_xuanwu.png', 'pet_jade.png', 130],
  ['pet_xuanwu.png', 'pet_holy.png', 200],
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  for (const [src, out, hue] of JOBS) {
    const srcPath = path.join(IMG_DIR, src);
    if (!fs.existsSync(srcPath)) { console.error('缺少源图', srcPath); continue; }
    const b64 = fs.readFileSync(srcPath).toString('base64');
    const dataUrl = 'data:image/png;base64,' + b64;
    const outB64 = await page.evaluate(async (dataUrl, hue) => {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d');
      g.filter = `hue-rotate(${hue}deg)`;
      g.drawImage(img, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    }, dataUrl, hue);
    const outPath = path.join(IMG_DIR, out);
    fs.writeFileSync(outPath, Buffer.from(outB64, 'base64'));
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`generated ${out} (${kb}KB)`);
  }
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
