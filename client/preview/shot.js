const puppeteer = require('puppeteer');
const CHROME = '/home/xiaolin/projects/dsh/chenxiao-wendao/client/preview/chrome/chrome-linux64/chrome';
const URL = process.argv[2] || 'http://127.0.0.1:9090/index.html';

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'home.png' });
  console.log('home.png');

  await page.evaluate(() => window.__game.toStages());
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'stages.png' });
  console.log('stages.png');

  await page.evaluate(() => window.__game.toEquip());
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'equip.png' });
  console.log('equip.png');

  await page.evaluate(() => window.__game.toBattle());
  await new Promise(r => setTimeout(r, 1600)); // 战斗中期（特效活跃）
  await page.screenshot({ path: 'battle_mid.png' });
  console.log('battle_mid.png');

  await new Promise(r => setTimeout(r, 4000)); // 战斗结束（掉落面板）
  await page.screenshot({ path: 'battle_end.png' });
  console.log('battle_end.png');

  await page.evaluate(() => window.__game.toBoss());
  await new Promise(r => setTimeout(r, 700)); // BOSS 登场
  await page.screenshot({ path: 'battle_boss.png' });
  console.log('battle_boss.png');

  await browser.close();
})();
