async function run() {
  const email = `occ_debug_${Date.now()}@workspace.dev`;
  const regRes = await fetch('http://localhost:5000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Password123!',
      name: 'OCC Debug User',
    }),
  });
  const regData = await regRes.json();
  const token = regData.data?.tokens?.accessToken || regData.data?.accessToken;

  const projRes = await fetch('http://localhost:5000/api/v1/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: 'OCC Debug Project' }),
  });
  const projData = await projRes.json();
  const projectId = projData.data.id;

  const taskRes = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: 'Base Task' }),
  });
  const taskData = await taskRes.json();
  const taskId = taskData.data.id;
  const baseVersion = taskData.data.version;

  console.log(`Starting 20 parallel updates on task ${taskId} (baseVersion: ${baseVersion})...`);
  const promises = Array.from({ length: 20 }, async (_, index) => {
    const res = await fetch(`http://localhost:5000/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: `Concurrent Title Edit #${index + 1}`,
        version: baseVersion,
      }),
    });
    const body = await res.json();
    return { status: res.status, body };
  });

  const results = await Promise.all(promises);
  let statusCounts = {};
  results.forEach((r, idx) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.status !== 200 && r.status !== 409) {
      console.log(`Request #${idx + 1} unexpected status ${r.status}:`, JSON.stringify(r.body, null, 2));
    }
  });
  console.log('Status counts:', statusCounts);
}

run().catch(console.error);
