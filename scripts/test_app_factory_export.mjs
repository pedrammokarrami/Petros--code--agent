import fs from 'fs';
import path from 'path';

async function main() {
  const code = `import React, { useState } from 'react';

export default function PetrosMetricsApp() {
  const [subscribers, setSubscribers] = useState(150);
  const [pricePerMonth, setPricePerMonth] = useState(49);
  const [darkMode, setDarkMode] = useState(true);

  const mrr = subscribers * pricePerMonth;
  const arr = mrr * 12;

  return (
    <div style={{ padding: '30px', fontFamily: 'system-ui', backgroundColor: darkMode ? '#0B0F19' : '#F8FAFC', color: darkMode ? '#F1F5F9' : '#0F172A', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold' }}>Petros SaaS Unit Economics</h1>
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
            Toggle {darkMode ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #1E293B', background: '#02040A' }}>
            <p style={{ fontSize: '11px', color: '#38BDF8', margin: '0 0 6px 0' }}>MONTHLY RECURRING (MRR)</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>\${mrr.toLocaleString()}</p>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #1E293B', background: '#02040A' }}>
            <p style={{ fontSize: '11px', color: '#34D399', margin: '0 0 6px 0' }}>ANNUAL RUN RATE (ARR)</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>\${arr.toLocaleString()}</p>
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #1E293B', background: '#02040A' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>Subscribers: {subscribers}</label>
            <input type="range" min="10" max="2000" step="10" value={subscribers} onChange={(e) => setSubscribers(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>Price / Month: \${pricePerMonth}</label>
            <input type="range" min="9" max="299" step="10" value={pricePerMonth} onChange={(e) => setPricePerMonth(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}`;

  console.log('1. Validating TSX with App Factory...');
  const vRes = await fetch('http://127.0.0.1:3000/api/app-factory/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, appName: 'PetrosMetricsApp' })
  });
  const vData = await vRes.json();
  console.log('Validation Result:', vData.valid, 'BuildTime:', vData.buildTimeMs + 'ms');

  console.log('2. Exporting App to standalone directory...');
  const eRes = await fetch('http://127.0.0.1:3000/api/app-factory/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: 'petros-metrics-app', sourceCode: code })
  });
  const eData = await eRes.json();
  console.log('Export Result:', eData.success, 'Path:', eData.exportPath);

  // Check exported files on disk
  const files = ['package.json', 'index.html', 'vite.config.ts', 'src/App.tsx', 'src/main.tsx'];
  for (const f of files) {
    const p = path.join(eData.exportPath, f);
    const exists = fs.existsSync(p);
    console.log(`File: ${f} -> Exists: ${exists} (${exists ? fs.statSync(p).size + ' bytes' : 'N/A'})`);
    if (!exists) throw new Error(`Missing expected exported file: ${f}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
