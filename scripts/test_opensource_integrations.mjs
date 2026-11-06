import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function main() {
  console.log('🧪 Starting Petros Open-Source Integrations Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // --- GAP A: PERSISTENT MEMORY ---
  await test('Gap A: Memory Context retrieval returns active startup memory', async () => {
    const res = await fetch(`${BASE_URL}/api/project/memory/context`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.context.includes('PETROS PERSISTENT PROJECT MEMORY'));
    assert.ok(data.context.includes('Startup Name:'));
  });

  await test('Gap A: Strategic Decision recording updates memory on disk', async () => {
    const payload = {
      title: 'Open-Source Stack Architecture Lock',
      reason: 'Use Playwright, Esbuild, and CrewAI-inspired squad orchestration for zero-cost execution',
      category: 'architecture'
    };
    const res = await fetch(`${BASE_URL}/api/project/memory/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const saved = data.memory.decisions.find(d => d.title === payload.title);
    assert.ok(saved);
  });

  // --- GAP B: PLAYWRIGHT COMPUTER USE ---
  await test('Gap B: Playwright Browser Status confirms Chrome engine', async () => {
    const res = await fetch(`${BASE_URL}/api/browser/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'ONLINE');
    assert.ok(data.capabilities.includes('navigation'));
  });

  await test('Gap B: Real Playwright navigation extracts live DOM snippet', async () => {
    const res = await fetch(`${BASE_URL}/api/browser/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://httpbin.org/get' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 200);
    assert.ok(data.snippet.includes('headers'));
  });

  // --- GAP C: MULTI-AGENT SQUAD ORCHESTRATION ---
  let approvalToken = null;
  let activeRunId = null;

  await test('Gap C: Squad listing discovers Startup Launch Squad', async () => {
    const res = await fetch(`${BASE_URL}/api/squad/list`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.squads.length >= 1);
    assert.strictEqual(data.squads[0].id, 'squad-startup-launch');
  });

  await test('Gap C: Squad Mission execution runs Strategy & Architecture, pauses at Engineering Approval Gate', async () => {
    const res = await fetch(`${BASE_URL}/api/squad/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        squadId: 'squad-startup-launch',
        missionPrompt: 'Build an autonomous real-estate analytics platform for MENA founders'
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.run.status, 'paused_approval');
    assert.ok(data.run.approvalToken);
    assert.ok(data.run.stageResults['stage-strategy']);
    assert.ok(data.run.stageResults['stage-architecture']);
    approvalToken = data.run.approvalToken;
    activeRunId = data.run.runId;
  });

  await test('Gap C: Human Approval Gate resumes mission, executes Engineering & Growth stages', async () => {
    assert.ok(activeRunId && approvalToken);
    const res = await fetch(`${BASE_URL}/api/squad/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: activeRunId,
        approvalToken: approvalToken
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.run.status, 'completed');
    assert.ok(data.run.stageResults['stage-engineering'].artifactPath);
    assert.ok(data.run.stageResults['stage-growth'].output);
  });

  // --- GAP D: APP FACTORY ESBUILD VALIDATION & REPAIR ---
  await test('Gap D: ESBuild validates valid React TSX code and compiles preview HTML', async () => {
    const sampleCode = `import React from 'react';
export default function LiveDemo() {
  return <div className="p-4 bg-slate-900 text-white"><h1>Live Demo App</h1></div>;
}`;
    const res = await fetch(`${BASE_URL}/api/app-factory/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sampleCode, appName: 'Live Demo' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.valid, true);
    assert.ok(data.previewHtml.includes('Live Demo App'));
  });

  await test('Gap D: ESBuild catches syntax errors and auto-repair restores validity', async () => {
    const brokenCode = `import React from 'react';
export default function BrokenDemo() {
  return <div className="p-4 bg-slate-900 text-white"><h1>Auto Repair Test</h1>;
}`;
    const res = await fetch(`${BASE_URL}/api/app-factory/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: brokenCode, appName: 'Repair Demo' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.valid, true);
    assert.strictEqual(data.repaired, true);
  });

  await test('Gap D: App Factory exports complete runnable project structure to disk', async () => {
    const code = `import React from 'react'; export default function App() { return <h1>Exported</h1>; }`;
    const res = await fetch(`${BASE_URL}/api/app-factory/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: 'test-exported-app', sourceCode: code })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.exportPath.includes('test-exported-app'));
  });

  console.log(`\n=============================================`);
  console.log(`🏁 Integration Results: ${passed} Passed, ${failed} Failed`);
  console.log(`=============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
