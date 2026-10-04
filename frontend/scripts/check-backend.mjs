import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
const HEALTH_URL = 'http://localhost:5000/health';

console.log('====================================================');
console.log('⚡ COLLABORATIVE WORKSPACE BACKEND CONNECTIVITY CHECK');
console.log('====================================================\n');

async function testStep(name, fn) {
  process.stdout.write(`[*] Testing: ${name}... `);
  try {
    const result = await fn();
    console.log('\x1b[32m[PASS]\x1b[0m');
    if (result && typeof result === 'string') {
      console.log(`    ↳ ${result}`);
    }
    return { ok: true, data: result };
  } catch (error) {
    console.log('\x1b[31m[FAIL]\x1b[0m');
    console.log(`    ↳ \x1b[33mError: ${error.message}\x1b[0m`);
    return { ok: false, error };
  }
}

async function runChecks() {
  let token = null;
  let user = null;
  let projects = [];

  // Step 1: Health
  const healthRes = await testStep('GET /health endpoint', async () => {
    const res = await fetch(HEALTH_URL);
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return `Status: ${data.status}, DB: ${data.database}, Version: ${data.version}`;
  });

  // Step 2: Auth Login
  const loginRes = await testStep('POST /auth/login (alex@workspace.dev)', async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex@workspace.dev',
        password: 'Password123!',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Status ${res.status}: ${err.error?.message || res.statusText}`);
    }
    const json = await res.json();
    token = json.data?.tokens?.accessToken || json.data?.accessToken;
    user = json.data?.user;
    return `Logged in as: ${user?.name} (${user?.email})`;
  });

  if (!loginRes.ok) {
    console.log('\n❌ Login failed! Cannot proceed with authenticated tests.');
    process.exit(1);
  }

  // Step 3: Auth Me
  await testStep('GET /auth/me (Current User Profile)', async () => {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const json = await res.json();
    return `Verified User ID: ${json.data.id}`;
  });

  // Step 4: Projects List
  const projectsRes = await testStep('GET /projects (User Project List)', async () => {
    const res = await fetch(`${API_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const json = await res.json();
    projects = json.data || [];
    return `Found ${projects.length} accessible project(s)`;
  });

  // Step 5: Socket.IO Connection & Authentication
  let socket = null;
  const socketRes = await testStep('Socket.IO Handshake Authentication', async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (socket) socket.disconnect();
        reject(new Error('Socket connection timed out after 5 seconds'));
      }, 5000);

      socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve(`Connected successfully with Socket ID: ${socket.id}`);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  // Step 6: Project Room Join & ACK
  if (socketRes.ok && projects.length > 0) {
    const testProjectId = projects[0].id;
    await testStep(`Socket 'project:join' Room (${projects[0].name})`, async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Room join ACK timed out after 5 seconds'));
        }, 5000);

        socket.emit('project:join', { projectId: testProjectId, lastSeq: 0 }, (ack) => {
          clearTimeout(timeout);
          if (!ack || ack.success === false) {
            reject(new Error('Server did not return a successful join ACK'));
          } else {
            resolve(`Joined room! currentSeq: ${ack.currentSeq}, online: ${ack.onlineUsers?.length || 0}`);
          }
        });
      });
    });
  }

  // Step 7: Clean Disconnect
  if (socket) {
    socket.disconnect();
  }

  console.log('\n====================================================');
  console.log('🎉 ALL BACKEND CONNECTION CHECKS COMPLETED!');
  console.log('====================================================\n');
}

runChecks().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
