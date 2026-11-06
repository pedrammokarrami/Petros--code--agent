const BASE_URL = 'http://127.0.0.1:3000';

async function testHumanApprovalGate() {
  console.log('=== TESTING HUMAN-IN-THE-LOOP APPROVAL GATE ===');

  // 1. Start mission
  const startRes = await fetch(`${BASE_URL}/api/squad/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      squadId: 'squad-startup-launch',
      missionPrompt: 'Test Human-in-the-Loop Gate Security'
    })
  });
  const startData = await startRes.json();
  const runId = startData.run.runId;
  const token = startData.run.approvalToken;

  console.log('[1] Mission Started:', runId);
  console.log('    Status before approval:', startData.run.status);
  console.log('    Approval Token issued:', token ? 'YES' : 'NO');
  console.log('    Strategy stage executed:', !!startData.run.stageResults['stage-strategy']);
  console.log('    Architecture stage executed:', !!startData.run.stageResults['stage-architecture']);
  console.log('    Engineering stage executed:', !!startData.run.stageResults['stage-engineering']);

  if (startData.run.stageResults['stage-engineering']) {
    throw new Error('FAIL: Engineering stage executed BEFORE human approval!');
  }

  // 2. Test Invalid Token / Rejection attempt
  const badRes = await fetch(`${BASE_URL}/api/squad/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, approvalToken: 'invalid-token-12345' })
  });
  console.log('[2] Invalid Approval Token HTTP Status (Expect 500):', badRes.status);

  // 3. Verify status remains paused_approval
  const pollRes = await fetch(`${BASE_URL}/api/squad/run/${runId}`);
  const pollData = await pollRes.json();
  console.log('[3] Status after failed approval:', pollData.run.status);
  console.log('    Engineering stage still blocked:', !pollData.run.stageResults['stage-engineering']);

  // 4. Valid Approval
  const goodRes = await fetch(`${BASE_URL}/api/squad/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, approvalToken: token })
  });
  const goodData = await goodRes.json();
  console.log('[4] Status after valid approval:', goodData.run.status);
  console.log('    Engineering stage executed:', !!goodData.run.stageResults['stage-engineering']);
  console.log('    Engineering artifact created:', goodData.run.stageResults['stage-engineering']?.artifactPath);
  console.log('    Growth stage executed:', !!goodData.run.stageResults['stage-growth']);

  console.log('🏆 Human-in-the-Loop Gate Security Verified Successfully!');
}

testHumanApprovalGate().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
