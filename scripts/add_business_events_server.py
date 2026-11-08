import os

server_path = 'server.ts'
with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """// --- APP FACTORY SANDBOX & VALIDATION APIS ---
app.post('/api/app-factory/validate', async (req: Request, res: Response) => {
  try {
    const code = req.body?.code || req.body?.sourceCode;
    const appName = req.body?.appName;
    if (!code) return res.status(400).json({ success: false, error: 'Code is required' });
    const result = await appFactory.validateAndBuild(code, appName || 'Petros App');
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

app.post('/api/app-factory/export', async (req: Request, res: Response) => {
  try {
    const { appId, sourceCode, overwrite = false } = req.body || {};
    if (!appId || !sourceCode) {
      return res.status(400).json({ success: false, error: 'appId and sourceCode are required' });
    }
    const appDir = path.join(WORKSPACE_ROOT, 'apps', 'generated', appId);
    if (fs.existsSync(appDir) && fs.readdirSync(appDir).length > 0 && !overwrite) {
      return res.status(409).json({
        success: false,
        error: `Project "${appId}" already exists at ${appDir}. Explicit overwrite consent required.`,
        requiresConsent: true,
        existingPath: appDir
      });
    }
    const exportPath = await appFactory.exportProject(appId, sourceCode, WORKSPACE_ROOT);
    res.json({ success: true, exportPath });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});"""

replacement = """// --- APP FACTORY SANDBOX & VALIDATION APIS ---
interface BusinessEventRecord {
  id: string;
  category: string;
  domain: string;
  type: string;
  title: string;
  description: string;
  metadata?: any;
  timestamp: number;
}

const businessEventStore: BusinessEventRecord[] = [
  {
    id: 'evt-init-campus',
    category: 'system',
    domain: 'campus',
    type: 'campus_online',
    title: 'Petros Headquarters Operational',
    description: 'Executive campus and domain infrastructure synchronized.',
    timestamp: Date.now() - 60000,
  },
  {
    id: 'evt-init-agency',
    category: 'agency',
    domain: 'agency',
    type: 'client_connected',
    title: 'Executive Client Strategy Session',
    description: 'Agency consulting pipeline synchronized with autonomous squads.',
    timestamp: Date.now() - 45000,
  },
  {
    id: 'evt-init-commerce',
    category: 'commerce',
    domain: 'commerce',
    type: 'inventory_updated',
    title: 'Omnichannel Logistics Online',
    description: 'Warehouse automated packaging stations and vehicle fleet ready.',
    timestamp: Date.now() - 30000,
  },
  {
    id: 'evt-init-content',
    category: 'content',
    domain: 'content',
    type: 'studio_ready',
    title: 'Media Broadcast Stage Calibrated',
    description: '4K Camera rigs and audio master consoles active.',
    timestamp: Date.now() - 15000,
  },
  {
    id: 'evt-init-research',
    category: 'research',
    domain: 'research',
    type: 'hpc_online',
    title: 'HPC Supercomputing Cluster Active',
    description: 'Neural synthesis diagnostic bench and optic sensor telemetry ready.',
    timestamp: Date.now() - 5000,
  },
];

app.get('/api/business-events', (req: Request, res: Response) => {
  res.json({ success: true, events: businessEventStore.slice(0, 50) });
});

app.post('/api/business-events', (req: Request, res: Response) => {
  const { event } = req.body || {};
  if (!event || !event.id) {
    return res.status(400).json({ success: false, error: 'Event object with id required' });
  }
  businessEventStore.unshift({ ...event, timestamp: event.timestamp || Date.now() });
  if (businessEventStore.length > 200) businessEventStore.pop();
  res.json({ success: true, event });
});

app.post('/api/app-factory/validate', async (req: Request, res: Response) => {
  try {
    const code = req.body?.code || req.body?.sourceCode;
    const appName = req.body?.appName;
    if (!code) return res.status(400).json({ success: false, error: 'Code is required' });
    const result = await appFactory.validateAndBuild(code, appName || 'Petros App');
    businessEventStore.unshift({
      id: `evt-app-validate-${Date.now()}`,
      category: 'research',
      domain: 'research',
      type: 'code_validated',
      title: `App Factory Validated: ${appName || 'Petros App'}`,
      description: 'Code validated and AST checked successfully.',
      timestamp: Date.now(),
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

app.post('/api/app-factory/export', async (req: Request, res: Response) => {
  try {
    const { appId, sourceCode, overwrite = false } = req.body || {};
    if (!appId || !sourceCode) {
      return res.status(400).json({ success: false, error: 'appId and sourceCode are required' });
    }
    const appDir = path.join(WORKSPACE_ROOT, 'apps', 'generated', appId);
    if (fs.existsSync(appDir) && fs.readdirSync(appDir).length > 0 && !overwrite) {
      return res.status(409).json({
        success: false,
        error: `Project "${appId}" already exists at ${appDir}. Explicit overwrite consent required.`,
        requiresConsent: true,
        existingPath: appDir
      });
    }
    const exportPath = await appFactory.exportProject(appId, sourceCode, WORKSPACE_ROOT);
    businessEventStore.unshift({
      id: `evt-app-export-${Date.now()}`,
      category: 'agency',
      domain: 'agency',
      type: 'project_exported',
      title: `Project Exported: ${appId}`,
      description: `Successfully exported to ${exportPath}`,
      timestamp: Date.now(),
    });
    res.json({ success: true, exportPath });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});"""

if target in content:
    content = content.replace(target, replacement)
    with open(server_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: server.ts updated with businessEventStore and endpoints")
else:
    print("ERROR: Target block not found in server.ts")
