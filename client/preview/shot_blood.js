const puppeteer = require('puppeteer');
const CHROME = '/home/xiaolin/projects/dsh/chenxiao-wendao/client/preview/chrome/chrome-linux64/chrome';
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:9090/index.html', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => window.__game.toBlood());
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: 'battle_blood.png' });
  console.log('battle_blood.png');
  await browser.close();
})();
