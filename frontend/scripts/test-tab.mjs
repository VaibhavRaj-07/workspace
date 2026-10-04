import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext();
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@workspace.dev', password: 'Password123!' })
  }).then(r => r.json());
  const token = loginRes.data.tokens.accessToken;
  await context.addInitScript(({ token, user }) => {
    sessionStorage.setItem('algo_access_token', token);
    sessionStorage.setItem('algo_user', JSON.stringify(user));
  }, { token, user: loginRes.data.user });

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  await page.goto('http://localhost:3000/projects/62b5a63a-fe3b-47f8-a666-15e2b89bfd98', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const tabBtn = page.locator('button:has-text("PROGRESS & RISK AI")').first();
  await tabBtn.click();
  await page.waitForTimeout(2000);

  console.log('Active tab text:', await page.locator('button.bg-acid-yellow').innerText());
  console.log('HTML of body contains ai-risk-gauge:', (await page.content()).includes('ai-risk-gauge'));
  console.log('HTML of body contains AI DELIVERY RISK:', (await page.content()).includes('AI DELIVERY RISK'));

  await browser.close();
}

test().catch(console.error);
