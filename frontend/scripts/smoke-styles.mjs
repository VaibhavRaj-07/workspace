import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

function parseBrutalShadow(boxShadow) {
  if (!boxShadow || boxShadow === 'none') return null;
  // Box shadow in Tailwind: rgba(0,0,0,0) 0px 0px 0px 0px, ..., rgb(10, 10, 10) 4px 4px 0px 0px
  // or 4px 4px 0px rgb(10, 10, 10)
  const parts = boxShadow.split(/,(?![^(]*\))/);
  for (const part of parts) {
    const match = part.match(/([1-9]\d*px)\s+([1-9]\d*px)/);
    if (match) {
      return {
        raw: part.trim(),
        xOffset: match[1],
        yOffset: match[2],
      };
    }
  }
  return null;
}

async function runSmokeStyles() {
  console.log('====================================================');
  console.log('🧪 RUNNING RIGOROUS STYLING SMOKE TEST (Playwright)');
  console.log('====================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch {
      browser = await chromium.launch({ headless: true });
    }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const screenshotDir = path.resolve('screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let css404Errors = [];
  page.on('response', (res) => {
    if (res.request().resourceType() === 'stylesheet' || res.url().includes('.css')) {
      if (res.status() === 404 || res.status() >= 400) {
        css404Errors.push({ url: res.url(), status: res.status() });
      }
    }
  });

  const routes = [
    { name: 'Login Gateway', path: '/login', requiresAuth: false },
    { name: 'Dashboard', path: '/', requiresAuth: true },
    { name: 'Projects Registry', path: '/projects', requiresAuth: true },
  ];

  let passed = true;

  for (const theme of ['LIGHT', 'DARK']) {
    console.log(`▶ TESTING THEME: ${theme}`);
    console.log('----------------------------------------------------');

    for (const r of routes) {
      css404Errors = [];

      if (r.requiresAuth) {
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        await page.fill('input[type="email"]', 'alex@workspace.dev');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1500);
      }

      await page.goto(`http://localhost:3000${r.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      if (theme === 'DARK') {
        await page.evaluate(() => document.documentElement.classList.add('dark'));
      } else {
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
      }
      await page.waitForTimeout(400);

      const shotName = `${r.name.toLowerCase().replace(/\s+/g, '_')}_${theme.toLowerCase()}.png`;
      await page.screenshot({ path: path.join(screenshotDir, shotName) });

      const check = await page.evaluate(() => {
        const bodyFont = window.getComputedStyle(document.body).fontFamily;
        const isNotTimes = !bodyFont.toLowerCase().includes('times') && (
          bodyFont.includes('Space Grotesk') ||
          bodyFont.includes('sans-serif') ||
          bodyFont.includes('Impact')
        );

        // Find primary action button
        const primaryBtn = document.querySelector('button[type="submit"], button.bg-acid-yellow, a.bg-acid-yellow, button.shadow-brutal, button.shadow-brutal-sm');
        let btnBorder = 0;
        let btnShadow = '';
        let btnBg = '';

        if (primaryBtn) {
          const btnStyle = window.getComputedStyle(primaryBtn);
          btnBorder = parseFloat(btnStyle.borderWidth) || 0;
          btnShadow = btnStyle.boxShadow;
          btnBg = btnStyle.backgroundColor;
        }

        // Find cards with hard-shadow class
        const cards = Array.from(document.querySelectorAll('.shadow-brutal, .shadow-brutal-sm, .shadow-brutal-lg, .border-3, .border-4'));
        const cardShadows = cards.map(c => window.getComputedStyle(c).boxShadow);

        return {
          bodyFont,
          isNotTimes,
          btnExists: !!primaryBtn,
          btnBorder,
          btnShadow,
          btnBg,
          cardsCount: cards.length,
          cardShadows,
        };
      });

      const btnShadowParsed = parseBrutalShadow(check.btnShadow);
      const cardShadowParsed = check.cardShadows.map(parseBrutalShadow).find(Boolean);

      const hasValidButton = check.btnExists && check.btnBorder >= 2 && btnShadowParsed !== null;
      const hasValidCardShadow = check.cardsCount > 0 && cardShadowParsed !== null;
      const noCss404 = css404Errors.length === 0;

      const routePass = check.isNotTimes && hasValidButton && hasValidCardShadow && noCss404;

      if (!routePass) {
        passed = false;
        console.error(`❌ FAIL on ${r.name} (${theme}):`, {
          isNotTimes: check.isNotTimes,
          bodyFont: check.bodyFont,
          btnExists: check.btnExists,
          btnBorder: `${check.btnBorder}px`,
          btnShadowRaw: check.btnShadow,
          btnShadowParsed,
          cardsCount: check.cardsCount,
          cardShadowParsed,
          css404Errors,
        });
      } else {
        console.log(`✓ ${r.name.padEnd(22)} | Font: ${check.bodyFont.slice(0, 20)}... | Border: ${check.btnBorder}px | Shadow: ${btnShadowParsed.xOffset} ${btnShadowParsed.yOffset} | Cards: ${check.cardsCount} | CSS 404s: 0`);
      }
    }
  }

  // Also test Kanban Workspace
  console.log('\n▶ TESTING PROJECT WORKSPACE (KANBAN BOARD)');
  const projectLink = await page.locator('a[href^="/projects/"]').first();
  if (await projectLink.isVisible()) {
    const projectHref = await projectLink.getAttribute('href');
    for (const theme of ['LIGHT', 'DARK']) {
      await page.goto(`http://localhost:3000${projectHref}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      if (theme === 'DARK') {
        await page.evaluate(() => document.documentElement.classList.add('dark'));
      } else {
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
      }
      await page.waitForTimeout(400);

      const check = await page.evaluate(() => {
        const bodyFont = window.getComputedStyle(document.body).fontFamily;
        const cards = Array.from(document.querySelectorAll('div[data-task-id], .shadow-brutal-sm, .border-3'));
        const shadows = cards.map(c => window.getComputedStyle(c).boxShadow);
        return { bodyFont, cardCount: cards.length, shadows };
      });

      const cardShadow = check.shadows.map(parseBrutalShadow).find(Boolean);
      const boardPass = check.cardCount > 0 && cardShadow !== null;

      if (!boardPass) {
        passed = false;
        console.error(`❌ FAIL on Kanban Board (${theme}):`, check);
      } else {
        console.log(`✓ Project Board (${theme}) | Font: ${check.bodyFont.slice(0, 20)}... | Cards: ${check.cardCount} | Shadow: ${cardShadow.xOffset} ${cardShadow.yOffset}`);
      }
    }
  }

  await browser.close();

  if (!passed) {
    console.error('\n❌ RIGOROUS STYLING SMOKE TEST FAILED!');
    process.exit(1);
  } else {
    console.log('\n====================================================');
    console.log('🎉 ALL RIGOROUS STYLING SMOKE TESTS PASSED (100%)');
    console.log('====================================================\n');
  }
}

runSmokeStyles().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
