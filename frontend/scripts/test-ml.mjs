async function testML() {
  console.log('--- 1. Testing ML Service Directly (:8000) ---');
  // Health
  const hRes = await fetch('http://localhost:8000/health');
  const hJson = await hRes.json();
  console.log('GET :8000/health ->', hRes.status, hJson);

  // Embed
  const eRes = await fetch('http://localhost:8000/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: ['Real-time WebSocket task collaboration engine'] }),
  });
  const eJson = await eRes.json();
  console.log('POST :8000/embed ->', eRes.status, 'Dimensions:', eJson.dimensions, 'Embeddings count:', eJson.embeddings?.length);

  // Predict Risk
  const rRes = await fetch('http://localhost:8000/predict-risk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      features: {
        task_age_days: 5,
        priority_encoded: 2,
        status_encoded: 1,
        hours_in_current_status: 30,
        assignee_open_tasks: 3,
        days_to_due_date: 2,
      },
    }),
  });
  const rJson = await rRes.json();
  console.log('POST :8000/predict-risk ->', rRes.status, rJson);

  console.log('\n--- 2. Testing via Backend Node Gateway (:5000) ---');
  // Login
  const authRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@workspace.dev', password: 'Password123!' }),
  });
  const authJson = await authRes.json();
  const token = authJson.data?.tokens?.accessToken || authJson.data?.accessToken;

  // Get project & task
  const projRes = await fetch('http://localhost:5000/api/v1/projects', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const projData = await projRes.json();
  const projectId = projData.data[0].id;

  const tasksRes = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tasksData = await tasksRes.json();
  const taskList = Array.isArray(tasksData.data) ? tasksData.data : tasksData.data?.tasks || [];
  const taskId = taskList[0].id;

  // AI 3-way merge synthesis
  const mergeRes = await fetch(`http://localhost:5000/api/v1/tasks/${taskId}/ai-merge-suggestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conflicts: {
        title: {
          baseValue: 'Vector Embedding Batch Pipeline',
          myValue: 'Alex: Optimized GPU Embedding Pipeline with Batching',
          theirValue: 'Sarah: Distributed Embedding Service with Ray',
        },
      },
      baseVersion: 1,
    }),
  });
  const mergeJson = await mergeRes.json();
  console.log(`POST :5000/api/v1/tasks/${taskId}/ai-merge-suggestion ->`, mergeRes.status, mergeJson);

  // Duplicate Check
  const dupRes = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks/check-duplicates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Vector Embedding Batch Pipeline',
      description: 'Generate embedding vectors for documents',
    }),
  });
  const dupJson = await dupRes.json();
  console.log(`POST :5000/api/v1/projects/${projectId}/tasks/check-duplicates ->`, dupRes.status, dupJson);

  // Suggest Assignee
  const sugRes = await fetch(`http://localhost:5000/api/v1/projects/${projectId}/tasks/suggest-assignee?title=Vector%20Pipeline`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sugJson = await sugRes.json();
  console.log(`GET :5000/api/v1/projects/${projectId}/tasks/suggest-assignee ->`, sugRes.status, sugJson);
}

testML().catch(console.error);
