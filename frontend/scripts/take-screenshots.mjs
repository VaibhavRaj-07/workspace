import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotsDir = path.resolve('./screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function run() {
  console.log('Launching browser to capture theme screenshots...');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch (err) {
      browser = await chromium.launch({ headless: true });
    }
  }

  // 1. Light theme context
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const lightPage = await lightContext.newPage();

  // Login Light
  await lightPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await lightPage.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await lightPage.waitForTimeout(1000);
  await lightPage.screenshot({ path: path.join(screenshotsDir, 'login_light.png'), fullPage: true });
  console.log('✓ Captured login_light.png');

  // Login Dark
  await lightPage.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await lightPage.waitForTimeout(1000);
  await lightPage.screenshot({ path: path.join(screenshotsDir, 'login_dark.png'), fullPage: true });
  console.log('✓ Captured login_dark.png');

  // Authenticate and open Board
  await lightPage.fill('input[type="email"]', 'alex@workspace.dev');
  await lightPage.fill('input[type="password"]', 'Password123!');
  await lightPage.click('button[type="submit"]');
  await lightPage.waitForSelector('text=WELCOME,', { timeout: 10000 });

  await lightPage.goto('http://localhost:3000/projects', { waitUntil: 'networkidle' });
  const link = await lightPage.locator('a[href^="/projects/"]').first().getAttribute('href');
  await lightPage.goto(`http://localhost:3000${link}`, { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(2000);

  // Board Dark
  await lightPage.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await lightPage.waitForTimeout(1000);
  await lightPage.screenshot({ path: path.join(screenshotsDir, 'board_dark.png'), fullPage: true });
  console.log('✓ Captured board_dark.png');

  // Board Light
  await lightPage.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await lightPage.waitForTimeout(1000);
  await lightPage.screenshot({ path: path.join(screenshotsDir, 'board_light.png'), fullPage: true });
  console.log('✓ Captured board_light.png');

  await browser.close();
  console.log('All screenshots captured successfully in /screenshots!');
}

run().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
