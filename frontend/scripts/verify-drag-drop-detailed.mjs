import { chromium } from 'playwright';

async function verifyDragDropDetailed() {
  const startTime = new Date().toISOString();
  console.log('====================================================');
  console.log(`🎯 DETAILED DRAG-AND-DROP WORKSPACE VERIFICATION`);
  console.log(`⏰ Run Start Time: ${startTime}`);
  console.log('====================================================\n');

  // 1. Authenticate Alex
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@workspace.dev', password: 'Password123!' }),
  }).then(r => r.json());

  if (!loginRes.data) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes));
  }

  const token = loginRes.data.tokens?.accessToken || loginRes.data.accessToken || loginRes.data.token;
  const user = loginRes.data.user;

  // 2. Get Alex's projects
  const projectsRes = await fetch('http://localhost:5000/api/v1/projects', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  const projects = projectsRes.data?.projects || projectsRes.data || [];
  if (!projects || projects.length === 0) {
    throw new Error('No projects found for user Alex');
  }
  const project = projects[0];
  const projectId = project.id;
  console.log(`📁 Target Project: "${project.name}" (ID: ${projectId})`);

  // 3. Create a FRESH Task in TODO status via API
  const runId = Math.random().toString(36).substring(2, 7);
  const taskTitle = `[DND-VERIFY-${runId.toUpperCase()}] Drag Verification Task`;
  console.log(`➕ Creating fresh task via API: "${taskTitle}"`);

  const createRes = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: taskTitle,
      description: 'Automated test task for drag-and-drop validation with real mouse events.',
      status: 'todo',
      priority: 'high',
      position: 10.0 // place at top of TODO
    })
  }).then(r => r.json());

  const createdTask = createRes.data?.task || createRes.data;
  if (!createdTask || !createdTask.id) {
    throw new Error('Task creation failed: ' + JSON.stringify(createRes));
  }
  const taskId = createdTask.id;
  console.log(`✓ Created Task ID: ${taskId} | Initial Status: ${createdTask.status} | Version: #${createdTask.version}`);

  // 4. Launch Browser & Navigate to Project Workspace
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Set auth persistence before navigating
  await context.addInitScript(({ token, user }) => {
    sessionStorage.setItem('algo_access_token', token);
    sessionStorage.setItem('algo_user', JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();

  try {
    const projectUrl = `http://localhost:3000/projects/${projectId}`;
    console.log(`▶ Navigating to workspace: ${projectUrl}`);
    await page.goto(projectUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 5. Find the new card in the TODO column
    const todoColumn = page.locator('div[data-column-id="todo"]').first();
    await todoColumn.waitFor({ state: 'visible', timeout: 8000 });

    const taskCard = page.locator(`div[data-task-id="${taskId}"]`).first();
    await taskCard.waitFor({ state: 'visible', timeout: 8000 });
    await taskCard.scrollIntoViewIfNeeded();

    // Verify task is inside TODO column
    const isInsideTodo = await todoColumn.locator(`div[data-task-id="${taskId}"]`).count() > 0;
    console.log('\n----------------------------------------------------');
    console.log('BEFORE DRAG ASSERTIONS:');
    console.log('----------------------------------------------------');
    console.log(`Card In TODO Column (UI): ${isInsideTodo ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Server Status (API):      ${createdTask.status} ✅`);
    console.log(`Initial Position:         ${createdTask.position}`);

    if (!isInsideTodo) {
      throw new Error(`Task card ${taskId} not found in TODO column DOM before drag!`);
    }

    // 6. Perform Real Mouse Drag-and-Drop to IN PROGRESS column
    const inProgressColumn = page.locator('div[data-column-id="in_progress"]').first();
    await inProgressColumn.waitFor({ state: 'visible' });

    const gripBtn = taskCard.locator('button[title="Drag task"]').first();
    await gripBtn.waitFor({ state: 'visible' });
    const gripBox = await gripBtn.boundingBox();
    const targetBox = await inProgressColumn.boundingBox();

    if (!gripBox || !targetBox) {
      throw new Error('Could not calculate bounding boxes for drag source/target');
    }

    const startX = gripBox.x + gripBox.width / 2;
    const startY = gripBox.y + gripBox.height / 2;
    const targetX = targetBox.x + targetBox.width / 2;
    const targetY = targetBox.y + 200;

    console.log(`\n▶ Performing real mouse drag from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${targetX.toFixed(1)}, ${targetY.toFixed(1)})...`);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(targetX, targetY, { steps: 40 });
    await page.waitForTimeout(400);
    await page.mouse.up();
    await page.waitForTimeout(3000);

    // 7. Check UI state immediately after drop
    const inProgressCardsNow = await inProgressColumn.locator(`div[data-task-id="${taskId}"]`).count();
    console.log(`Card in IN_PROGRESS Column immediately after drop: ${inProgressCardsNow > 0 ? 'YES ✅' : 'NO ❌'}`);

    // 8. Reload page to verify persistence across hard navigation
    console.log('▶ Reloading browser page to verify backend persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 9. Verify UI state after reload
    const inProgressColAfter = page.locator('div[data-column-id="in_progress"]').first();
    const cardAfterReload = inProgressColAfter.locator(`div[data-task-id="${taskId}"]`).first();
    const isVisibleInColAfter = await cardAfterReload.count() > 0;

    // 10. Fetch updated task state via API
    const verifyRes = await fetch(`http://localhost:5000/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    const updatedTask = verifyRes.data?.task || verifyRes.data;

    console.log('\n----------------------------------------------------');
    console.log('AFTER DRAG & RELOAD ASSERTIONS:');
    console.log('----------------------------------------------------');
    console.log(`Task ID:                 ${taskId}`);
    console.log(`Title:                   "${updatedTask.title}"`);
    console.log(`UI Column (Post-Reload): IN PROGRESS (${isVisibleInColAfter ? 'CONFIRMED ✅' : 'FAILED ❌'})`);
    console.log(`Server Status (API):     ${updatedTask.status} (${updatedTask.status === 'in_progress' ? 'CONFIRMED ✅' : 'FAILED ❌'})`);
    console.log(`Server Version:          #${updatedTask.version}`);
    console.log(`Server Position Index:   ${updatedTask.position}`);

    if (!isVisibleInColAfter || updatedTask.status !== 'in_progress') {
      throw new Error(`Drag-and-drop failed: UI or Server status did not transition to in_progress`);
    }

    console.log('\n====================================================');
    console.log('🎉 DRAG-AND-DROP E2E TEST PASSED WITH 100% INTEGRITY');
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

verifyDragDropDetailed().catch(err => {
  console.error('❌ Drag-drop verification failed:', err);
  process.exit(1);
});
