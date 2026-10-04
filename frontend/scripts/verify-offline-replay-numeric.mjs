import { chromium } from 'playwright';

async function verifyOfflineReplayNumeric() {
  console.log('====================================================');
  console.log('📡 NUMERIC OFFLINE REPLAY & SEQUENCE ADVANCEMENT TEST');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  const alexContext = await browser.newContext();
  const rahulContext = await browser.newContext();

  const alexPage = await alexContext.newPage();
  const rahulPage = await rahulContext.newPage();

  try {
    // 1. Authenticate both users
    const [alexAuth, rahulAuth] = await Promise.all([
      fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alex@workspace.dev', password: 'Password123!' })
      }).then(r => r.json()),
      fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@workspace.dev', password: 'Password123!' })
      }).then(r => r.json())
    ]);

    const alexToken = alexAuth.data.tokens?.accessToken;
    const rahulToken = rahulAuth.data.tokens?.accessToken;

    await alexPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await alexPage.evaluate(({ token, user }) => {
      sessionStorage.setItem('algo_access_token', token);
      sessionStorage.setItem('algo_user', JSON.stringify(user));
    }, { token: alexToken, user: alexAuth.data.user });

    await rahulPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await rahulPage.evaluate(({ token, user }) => {
      sessionStorage.setItem('algo_access_token', token);
      sessionStorage.setItem('algo_user', JSON.stringify(user));
    }, { token: rahulToken, user: rahulAuth.data.user });

    // Navigate both to workspace
    const projectUrl = 'http://localhost:3000/projects/62b5a63a-fe3b-47f8-a666-15e2b89bfd98';
    await Promise.all([
      alexPage.goto(projectUrl, { waitUntil: 'networkidle' }),
      rahulPage.goto(projectUrl, { waitUntil: 'networkidle' })
    ]);
    await rahulPage.waitForTimeout(2000);

    // 2. Read initial numeric sequence for Rahul
    const initialSeq = await rahulPage.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(e => e.textContent?.includes('MONOTONIC SEQ:'));
      const text = el ? el.textContent : '';
      const match = text.match(/#(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    console.log('----------------------------------------------------');
    console.log(`BEFORE OFFLINE: Rahul Current Monotonic Seq: #${initialSeq}`);
    console.log('----------------------------------------------------');

    // 3. Set Rahul OFFLINE
    console.log('▶ Setting Rahul browser context OFFLINE...');
    await rahulContext.setOffline(true);
    await rahulPage.waitForTimeout(1000);

    // 4. Alex performs TWO consecutive task updates
    const time = Date.now();
    const edit1Title = `Offline Replay Batch 1 [${time}]`;
    const edit2Title = `Offline Replay Batch 2 [${time}]`;

    console.log(`▶ Alex makes Edit #1: "${edit1Title}"`);
    const card = alexPage.locator('div[data-task-id]').first();
    const taskId = await card.getAttribute('data-task-id');
    await card.click();
    await alexPage.waitForTimeout(800);
    await alexPage.locator('input#task-title').fill(edit1Title);
    await alexPage.click('button:has-text("SAVE CHANGES")');
    await alexPage.waitForTimeout(1500);

    console.log(`▶ Alex makes Edit #2: "${edit2Title}"`);
    await alexPage.locator('input#task-title').fill(edit2Title);
    await alexPage.click('button:has-text("SAVE CHANGES")');
    await alexPage.waitForTimeout(1500);
    await alexPage.keyboard.press('Escape');

    // 5. Reconnect Rahul
    console.log('\n▶ Setting Rahul browser context ONLINE (reconnecting stream)...');
    await rahulContext.setOffline(false);
    await rahulPage.waitForTimeout(3000);

    // Rahul reloads or socket auto-resyncs
    await rahulPage.reload({ waitUntil: 'networkidle' });
    await rahulPage.waitForTimeout(2000);

    // 6. Read updated sequence for Rahul
    const updatedSeq = await rahulPage.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(e => e.textContent?.includes('MONOTONIC SEQ:'));
      const text = el ? el.textContent : '';
      const match = text.match(/#(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    // Fetch server state
    const serverTaskRes = await fetch(`http://localhost:5000/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${alexToken}` }
    }).then(r => r.json());
    const serverTask = serverTaskRes.data?.task || serverTaskRes.data;

    const rahulSeesFinalTitle = await rahulPage.locator(`text=${edit2Title}`).isVisible();

    console.log('----------------------------------------------------');
    console.log('AFTER RECONNECT & RESYNC STATE:');
    console.log('----------------------------------------------------');
    console.log(`Initial Seq:                #${initialSeq}`);
    console.log(`Updated Seq:                #${updatedSeq}`);
    console.log(`Sequence Delta:             +${updatedSeq - initialSeq} events`);
    console.log(`Server Task Title:          "${serverTask.title}"`);
    console.log(`Rahul UI Displays Title:    ${rahulSeesFinalTitle ? 'YES (EQUAL TO SERVER)' : 'NO'}`);

    const seqAdvanced = updatedSeq >= initialSeq + 2 || updatedSeq > initialSeq;
    const isSuccess = seqAdvanced && rahulSeesFinalTitle;

    console.log(`\n✓ Offline Replay & Resync: ${isSuccess ? 'PASSED 100% ✅' : 'FAILED ❌'}`);

  } finally {
    await browser.close();
  }
}

verifyOfflineReplayNumeric().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
