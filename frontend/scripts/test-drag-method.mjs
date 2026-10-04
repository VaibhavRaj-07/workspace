import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@workspace.dev', password: 'Password123!' }),
  }).then(r => r.json());
  const token = loginRes.data.tokens?.accessToken || loginRes.data.accessToken || loginRes.data.token;
  
  const projectId = '62b5a63a-fe3b-47f8-a666-15e2b89bfd98';
  const createRes = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: '[TEST-DND] Mouse Coordinates Test',
      status: 'todo',
      priority: 'high',
      position: 10.0,
    })
  }).then(r => r.json());
  const taskId = createRes.data.id;
  console.log('Created test task:', taskId);

  await context.addInitScript(({ token, user }) => {
    sessionStorage.setItem('algo_access_token', token);
    sessionStorage.setItem('algo_user', JSON.stringify(user));
  }, { token, user: loginRes.data.user });

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto(`http://localhost:3000/projects/${projectId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const card = page.locator(`div[data-task-id="${taskId}"]`).first();
  await card.scrollIntoViewIfNeeded();
  const grip = card.locator('button[title="Drag task"]').first();
  const targetCol = page.locator('div[data-column-id="in_progress"]').first();

  const gripBox = await grip.boundingBox();
  const targetBox = await targetCol.boundingBox();

  console.log('Grip box:', gripBox);
  console.log('Target box:', targetBox);

  const startX = gripBox.x + gripBox.width / 2;
  const startY = gripBox.y + gripBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  console.log(`Dragging from (${startX}, ${startY}) to (${targetX}, ${targetY})...`);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(targetX, targetY, { steps: 50 });
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(3000);

  // Check API
  const checkRes = await fetch(`http://localhost:5000/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  console.log('Server task after drag:', checkRes.data.status, checkRes.data.position);
  await browser.close();
}

test().catch(console.error);
