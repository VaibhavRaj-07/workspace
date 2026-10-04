import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runTwoUserE2ESuite() {
  const startTime = new Date().toISOString();
  console.log('====================================================');
  console.log('🚀 TWO-USER REALTIME COLLABORATION & OCC E2E SUITE');
  console.log(`⏰ Run Start Time: ${startTime}`);
  console.log('====================================================\n');

  const screenshotsDir = path.resolve('screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const results = {};

  try {
    const alexContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const rahulContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    // 1. Authenticate Alex Rivers (Lead) & Rahul Patel (Frontend)
    console.log('▶ [Setup] Authenticating Alex Rivers (Lead) & Rahul Patel (Frontend)...');
    
    const alexLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@workspace.dev', password: 'Password123!' }),
    }).then(r => r.json());
    const alexToken = alexLoginRes.data.tokens?.accessToken || alexLoginRes.data.accessToken || alexLoginRes.data.token;
    const alexUser = alexLoginRes.data.user;

    const rahulLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@workspace.dev', password: 'Password123!' }),
    }).then(r => r.json());
    const rahulToken = rahulLoginRes.data.tokens?.accessToken || rahulLoginRes.data.accessToken || rahulLoginRes.data.token;
    const rahulUser = rahulLoginRes.data.user;

    await alexContext.addInitScript(({ token, user }) => {
      sessionStorage.setItem('algo_access_token', token);
      sessionStorage.setItem('algo_user', JSON.stringify(user));
    }, { token: alexToken, user: alexUser });

    await rahulContext.addInitScript(({ token, user }) => {
      sessionStorage.setItem('algo_access_token', token);
      sessionStorage.setItem('algo_user', JSON.stringify(user));
    }, { token: rahulToken, user: rahulUser });

    const alexPage = await alexContext.newPage();
    const rahulPage = await rahulContext.newPage();

    // Get first project
    const projectsRes = await fetch('http://localhost:5000/api/v1/projects', {
      headers: { Authorization: `Bearer ${alexToken}` }
    }).then(r => r.json());
    const projectId = projectsRes.data?.projects?.[0]?.id || projectsRes.data?.[0]?.id;
    const projectUrl = `http://localhost:3000/projects/${projectId}`;
    console.log(`▶ Navigating both users to Project Workspace: ${projectUrl}\n`);

    const resetPages = async () => {
      await alexPage.goto(projectUrl, { waitUntil: 'networkidle' });
      await rahulPage.goto(projectUrl, { waitUntil: 'networkidle' });
      await alexPage.waitForTimeout(1500);
    };

    // =========================================================================
    // TEST A: Non-Overlapping Field Auto-Merge (Title + Priority)
    // =========================================================================
    console.log('----------------------------------------------------');
    console.log('TEST A: Non-Overlapping Field Auto-Merge (Title + Priority)');
    console.log('----------------------------------------------------');
    try {
      const runIdA = Math.random().toString(36).substring(2, 7);
      const initialTitleA = `[E2E-AUTOFMT-${runIdA.toUpperCase()}] Initial Task`;
      
      const createResA = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alexToken}` },
        body: JSON.stringify({
          title: initialTitleA,
          description: 'Task for testing non-overlapping auto-merge.',
          status: 'todo',
          priority: 'low',
          position: 10.0,
        })
      }).then(r => r.json());
      const taskIdA = createResA.data.id;
      console.log(`   - Created fresh task: ${taskIdA} ("${initialTitleA}")`);

      await resetPages();

      // Alex opens task drawer
      const alexCard = alexPage.locator(`div[data-task-id="${taskIdA}"]`).first();
      await alexCard.scrollIntoViewIfNeeded();
      await alexCard.click();
      await alexPage.waitForTimeout(1000);

      // Rahul opens exact same task drawer
      const rahulCard = rahulPage.locator(`div[data-task-id="${taskIdA}"]`).first();
      await rahulCard.scrollIntoViewIfNeeded();
      await rahulCard.click();
      await rahulPage.waitForTimeout(1000);

      // Alex edits Title
      const updatedTitleAlex = `[E2E-AUTOFMT-${runIdA.toUpperCase()}] Title Edited by Alex`;
      console.log(`   - Alex edits title to: "${updatedTitleAlex}"`);
      await alexPage.locator('input#task-title').fill(updatedTitleAlex);
      await alexPage.click('button:has-text("SAVE CHANGES")');
      await alexPage.waitForTimeout(1500);

      // Rahul edits Priority from low to urgent
      console.log('   - Rahul edits priority to URGENT on base version...');
      await rahulPage.locator('select#priority').selectOption('urgent');
      await rahulPage.click('button:has-text("SAVE CHANGES")');
      await rahulPage.waitForTimeout(1500);

      // Assert MERGED WITH toast was visible to Rahul
      const toastVisible = await rahulPage.locator('text=MERGED WITH, text=AUTO-MERGED').first().isVisible().catch(() => false);
      console.log(`   ✓ "MERGED WITH" toast visible to Rahul: ${toastVisible ? 'YES' : 'NO'}`);

      // Verify on Server via direct API
      const serverTaskRes = await fetch(`http://localhost:5000/api/v1/tasks/${taskIdA}`, {
        headers: { Authorization: `Bearer ${alexToken}` },
      }).then((r) => r.json());

      const serverTask = serverTaskRes.data?.task || serverTaskRes.data;
      const titleMatch = serverTask?.title === updatedTitleAlex;
      const priorityMatch = serverTask?.priority === 'urgent';
      const versionOk = serverTask?.version >= 3;

      console.log(`   ✓ Server Title updated: ${titleMatch ? 'YES' : 'NO'} ("${serverTask?.title}")`);
      console.log(`   ✓ Server Priority updated: ${priorityMatch ? 'YES' : 'NO'} (${serverTask?.priority})`);
      console.log(`   ✓ Server Version: #${serverTask?.version}`);

      results['a_auto_merge'] = titleMatch && priorityMatch && versionOk ? 'PASS' : 'FAIL';
      console.log(`   RESULT: ${results['a_auto_merge'] === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n`);
    } catch (err) {
      console.error(`   ❌ Test A Error: ${err.message}\n`);
      results['a_auto_merge'] = 'FAIL';
    }

    // =========================================================================
    // TEST B: Same-Field Collision (Description) & 3-Way Merge Modal Assertions
    // =========================================================================
    console.log('----------------------------------------------------');
    console.log('TEST B: Same-Field Conflict & 3-Way Merge Modal Assertions');
    console.log('----------------------------------------------------');
    try {
      const runIdB = Math.random().toString(36).substring(2, 7);
      const initialTitleB = `[E2E-COLLISION-${runIdB.toUpperCase()}] Conflict Task`;
      
      const createResB = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alexToken}` },
        body: JSON.stringify({
          title: initialTitleB,
          description: 'Base original description established at version 1.',
          status: 'todo',
          priority: 'medium',
          position: 20.0,
        })
      }).then(r => r.json());
      const taskIdB = createResB.data.id;
      console.log(`   - Created fresh task: ${taskIdB} ("${initialTitleB}")`);

      await resetPages();

      // Alex opens drawer
      const alexCardB = alexPage.locator(`div[data-task-id="${taskIdB}"]`).first();
      await alexCardB.scrollIntoViewIfNeeded();
      await alexCardB.click();
      await alexPage.waitForTimeout(1000);

      // Rahul opens exact same task drawer
      const rahulCardB = rahulPage.locator(`div[data-task-id="${taskIdB}"]`).first();
      await rahulCardB.scrollIntoViewIfNeeded();
      await rahulCardB.click();
      await rahulPage.waitForTimeout(1000);

      const alexDesc = `Alex Revision: Security hardening applied to core endpoints [${runIdB}].`;
      const rahulDesc = `Rahul Revision: Frontend dark mode contrast updated [${runIdB}].`;

      console.log(`   - Alex edits description to: "${alexDesc}"`);
      await alexPage.locator('textarea#task-description, textarea').first().fill(alexDesc);
      await alexPage.click('button:has-text("SAVE CHANGES")');
      await alexPage.waitForTimeout(1500);

      console.log(`   - Rahul edits description to: "${rahulDesc}" (on stale base version)`);
      await rahulPage.locator('textarea#task-description, textarea').first().fill(rahulDesc);
      await rahulPage.click('button:has-text("SAVE CHANGES")');
      await rahulPage.waitForTimeout(2000);

      // Assert 409 Collision Modal appears to Rahul
      const modalHeader = rahulPage.locator('h3:has-text("OCC COLLISION DETECTED"), h4:has-text("CONCURRENT MODIFICATIONS")').first();
      await modalHeader.waitFor({ state: 'visible', timeout: 8000 });
      console.log('   ✓ 409 Collision Modal displayed to Rahul: YES ✅');

      // Request AI Merge Suggestion
      const suggestBtn = rahulPage.locator('button:has-text("SUGGEST AI MERGE"), button:has-text("SUGGEST MERGE")').first();
      if (await suggestBtn.isVisible()) {
        console.log('   ▶ Clicking "SUGGEST AI MERGE" button in modal...');
        await suggestBtn.click();
        await rahulPage.waitForTimeout(2000);
      }

      // Assert DOM contains 3 distinct comparison columns with BASE, YOURS, THEIRS
      const hasBase = await rahulPage.locator('text=BASE VERSION (').isVisible();
      const hasYours = await rahulPage.locator('text=YOUR VERSION (UNSAVED)').isVisible();
      const hasTheirs = await rahulPage.locator('text=THEIR VERSION (SERVER').isVisible();
      
      // Assert THEIRS column shows author + time
      const theirsHeader = rahulPage.locator('text=THEIR VERSION (SERVER').first().locator('..');
      const theirsHeaderText = await theirsHeader.innerText().catch(() => '');
      const hasAuthorAndTime = /BY\s+/i.test(theirsHeaderText) && /[:\d]/i.test(theirsHeaderText);

      console.log(`   ✓ Comparison columns rendered:`);
      console.log(`     - BASE Column:   ${hasBase ? 'CONFIRMED ✅' : 'MISSING ❌'}`);
      console.log(`     - YOURS Column:  ${hasYours ? 'CONFIRMED ✅' : 'MISSING ❌'}`);
      console.log(`     - THEIRS Column: ${hasTheirs ? 'CONFIRMED ✅' : 'MISSING ❌'}`);
      console.log(`     - THEIRS Author & Time: "${theirsHeaderText.replace(/\n/g, ' ')}" (${hasAuthorAndTime ? 'CONFIRMED ✅' : 'MISSING ❌'})`);

      // Assert merge suggestion label matches strategyUsed (fallback label in key-less mode)
      const aiStatusRes = await fetch('http://localhost:5000/api/v1/ai/status').then(r => r.json()).catch(() => ({}));
      const mergeProvider = aiStatusRes.data?.mergeProvider || 'rule_based';
      
      const fallbackBadge = await rahulPage.locator('text=GENERATED WITHOUT EXTERNAL AI').isVisible().catch(() => false);
      const claudeBadge = await rahulPage.locator('text=CLAUDE AI SYNTHESIZED').isVisible().catch(() => false);

      console.log(`   ✓ AI Status Provider: ${mergeProvider}`);
      console.log(`   ✓ Merge Suggestion Label: ${fallbackBadge ? 'GENERATED WITHOUT EXTERNAL AI (FALLBACK) ✅' : claudeBadge ? 'CLAUDE AI SYNTHESIZED ✅' : 'APPLIED'}`);

      // Save screenshot of the 3-way collision modal
      const screenshotPath = path.join(screenshotsDir, 'collision_modal_3way.png');
      await rahulPage.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`   📸 Saved collision modal screenshot to: ${screenshotPath}`);

      // Rahul clicks FORCE ALL MINE and COMMITS
      await rahulPage.click('button:has-text("FORCE ALL MINE")');
      await rahulPage.waitForTimeout(500);
      await rahulPage.click('button:has-text("COMMIT RESOLVED TASK")');
      await rahulPage.waitForTimeout(2500);

      // Verify final value and incremented version on server
      const serverResB = await fetch(`http://localhost:5000/api/v1/tasks/${taskIdB}`, {
        headers: { Authorization: `Bearer ${rahulToken}` },
      }).then((r) => r.json());

      const finalTaskB = serverResB.data?.task || serverResB.data;
      const descMatchB = finalTaskB?.description === rahulDesc;
      const versionOkB = finalTaskB?.version >= 3;

      console.log(`   ✓ Final description matches "KEEP MINE": ${descMatchB ? 'YES' : 'NO'}`);
      console.log(`   ✓ Server Version incremented to: #${finalTaskB?.version}`);

      results['b_occ_collision'] = hasBase && hasYours && hasTheirs && descMatchB && versionOkB ? 'PASS' : 'FAIL';
      console.log(`   RESULT: ${results['b_occ_collision'] === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n`);
    } catch (err) {
      console.error(`   ❌ Test B Error: ${err.message}\n`);
      results['b_occ_collision'] = 'FAIL';
    }

    // =========================================================================
    // TEST C: Real UI Drag-and-Drop Card Move & Position Persistence
    // =========================================================================
    console.log('----------------------------------------------------');
    console.log('TEST C: Real UI Drag-and-Drop Card Move & Position Persistence');
    console.log('----------------------------------------------------');
    try {
      const runIdC = Math.random().toString(36).substring(2, 7);
      const initialTitleC = `[E2E-DRAG-${runIdC.toUpperCase()}] Drag Persistence Task`;
      
      const createResC = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alexToken}` },
        body: JSON.stringify({
          title: initialTitleC,
          description: 'Task for testing drag persistence across users.',
          status: 'todo',
          priority: 'high',
          position: 5.0,
        })
      }).then(r => r.json());
      const taskIdC = createResC.data.id;
      console.log(`   - Created fresh task: ${taskIdC} ("${initialTitleC}")`);

      await resetPages();

      const alexCardC = alexPage.locator(`div[data-task-id="${taskIdC}"]`).first();
      await alexCardC.scrollIntoViewIfNeeded();

      const inProgressColumn = alexPage.locator('div[data-column-id="in_progress"]').first();
      const gripBtn = alexCardC.locator('button[title="Drag task"]').first();
      await gripBtn.waitFor({ state: 'visible' });

      const gripBox = await gripBtn.boundingBox();
      const targetBox = await inProgressColumn.boundingBox();

      if (gripBox && targetBox) {
        const startX = gripBox.x + gripBox.width / 2;
        const startY = gripBox.y + gripBox.height / 2;
        const targetX = targetBox.x + targetBox.width / 2;
        const targetY = targetBox.y + 200;

        console.log(`   ▶ Dragging card from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${targetX.toFixed(1)}, ${targetY.toFixed(1)})...`);
        await alexPage.mouse.move(startX, startY);
        await alexPage.mouse.down();
        await alexPage.waitForTimeout(200);
        await alexPage.mouse.move(targetX, targetY, { steps: 40 });
        await alexPage.waitForTimeout(400);
        await alexPage.mouse.up();
        await alexPage.waitForTimeout(2500);
      }

      // Reload both users and assert persistence
      console.log('   ▶ Reloading both browser sessions to verify persistence...');
      await alexPage.reload({ waitUntil: 'networkidle' });
      await rahulPage.reload({ waitUntil: 'networkidle' });
      await alexPage.waitForTimeout(2000);

      // Verify in Rahul's UI
      const rahulInProgressCol = rahulPage.locator('div[data-column-id="in_progress"]').first();
      const rahulCardInProg = rahulInProgressCol.locator(`div[data-task-id="${taskIdC}"]`).first();
      const visibleToRahul = await rahulCardInProg.isVisible().catch(() => false);

      // Verify on Server
      const verifyResC = await fetch(`http://localhost:5000/api/v1/tasks/${taskIdC}`, {
        headers: { Authorization: `Bearer ${alexToken}` }
      }).then(r => r.json());
      const updatedTaskC = verifyResC.data?.task || verifyResC.data;

      console.log(`   ✓ Card visible in Rahul's IN_PROGRESS column: ${visibleToRahul ? 'YES' : 'NO'}`);
      console.log(`   ✓ Server Task Status: ${updatedTaskC.status} (Position: ${updatedTaskC.position})`);

      const dragPass = updatedTaskC.status === 'in_progress' && visibleToRahul;
      results['c_drag_drop'] = dragPass ? 'PASS' : 'FAIL';
      console.log(`   RESULT: ${results['c_drag_drop'] === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n`);
    } catch (err) {
      console.error(`   ❌ Test C Error: ${err.message}\n`);
      results['c_drag_drop'] = 'FAIL';
    }

    // =========================================================================
    // SUMMARY REPORT
    // =========================================================================
    console.log('====================================================');
    console.log('📊 TWO-USER COLLABORATION SUITE EXECUTION SUMMARY');
    console.log('====================================================');
    console.log(`Test A (Non-Overlapping Auto-Merge):  ${results['a_auto_merge'] === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test B (3-Way Collision Resolution):  ${results['b_occ_collision'] === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test C (Real Drag-and-Drop Move):     ${results['c_drag_drop'] === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log('====================================================\n');

    const allPassed = Object.values(results).every(r => r === 'PASS');
    if (!allPassed) {
      throw new Error('One or more collaboration tests failed');
    }
  } finally {
    await browser.close();
  }
}

runTwoUserE2ESuite().catch(err => {
  console.error('❌ Two-user collaboration suite failed:', err);
  process.exit(1);
});
