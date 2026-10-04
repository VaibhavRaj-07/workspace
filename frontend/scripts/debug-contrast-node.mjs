import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login Alex
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'alex@workspace.dev');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  const projectLink = await page.locator('a[href^="/projects/"]').first();
  const projectHref = await projectLink.getAttribute('href');
  await page.goto(`http://localhost:3000${projectHref}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 1. Task Drawer (Dark)
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.locator('div[data-task-id]').first().click();
  await page.waitForTimeout(800);

  const drawerAxe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  console.log('=== DRAWER CONTRAST VIOLATIONS ===');
  drawerAxe.violations.forEach((v) => {
    v.nodes.forEach((n) => {
      console.log('Node HTML:', n.html);
      console.log('Failure summary:', n.failureSummary);
    });
  });

  // 2. Trigger real OCC Collision Modal
  const taskId = await page.locator('div[data-task-id]').first().getAttribute('data-task-id');
  await page.evaluate(async (tid) => {
    const token = localStorage.getItem('token_access_token');
    await fetch(`http://localhost:5000/api/v1/tasks/${tid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ description: `Server Revision ${Date.now()}` }),
    });
  }, taskId);

  await page.locator('textarea#task-description, textarea').first().fill('My Stale Local Revision');
  await page.click('button:has-text("SAVE CHANGES")');
  await page.waitForTimeout(1500);

  const modalAxe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  console.log('\n=== REAL COLLISION MODAL CONTRAST VIOLATIONS ===');
  modalAxe.violations.forEach((v) => {
    v.nodes.forEach((n) => {
      console.log('Node HTML:', n.html);
      console.log('Failure summary:', n.failureSummary);
    });
  });

  await browser.close();
}

run().catch(console.error);
