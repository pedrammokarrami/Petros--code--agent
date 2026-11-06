import fs from 'fs';
import path from 'path';

export interface StartupProfile {
  name: string;
  industry: string;
  businessModel: 'saas' | 'ecommerce' | 'agency' | 'api' | 'physical';
  valueProp: string;
  targetCustomer: string;
  stage: 'idea' | 'research' | 'mvp' | 'growth' | 'scaling';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemory {
  startup: StartupProfile;
  milestones: { id: string; title: string; category: string; done: boolean; completedAt?: string }[];
  decisions: { id: string; title: string; reason: string; category: string; timestamp: string }[];
  leads: { id: string; name: string; email: string; stage: 'lead' | 'contacted' | 'negotiation' | 'won'; value: number }[];
  artifacts: { id: string; name: string; path: string; category: string; createdAt: string }[];
  notes: string[];
}

const DEFAULT_MEMORY: ProjectMemory = {
  startup: {
    name: 'Petros Autonomous Startup',
    industry: 'Software & AI Automation',
    businessModel: 'saas',
    valueProp: 'Autonomous AI startup creation and zero-cost business execution platform',
    targetCustomer: 'Founders, Developers, Product Architects',
    stage: 'mvp',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  milestones: [
    { id: 'm-1', title: 'Local Workspace and Zero-Cost Architecture Initialized', category: 'infrastructure', done: true, completedAt: new Date().toISOString() },
    { id: 'm-2', title: 'Supervisor Loopback Verification & Free Kilo Lock Confirmed', category: 'security', done: true, completedAt: new Date().toISOString() },
    { id: 'm-3', title: 'Comprehensive 100/100 Acceptance Suite Passed', category: 'quality', done: true, completedAt: new Date().toISOString() },
    { id: 'm-4', title: 'Autonomous Multi-Step Startup Planner Operational', category: 'ai-core', done: false },
    { id: 'm-5', title: 'Visual Petros Flow Node Automation Active', category: 'automation', done: false },
    { id: 'm-6', title: 'App Factory Multi-Device Preview Scaffolder Ready', category: 'app-factory', done: false },
  ],
  decisions: [
    {
      id: 'd-1',
      title: 'Zero-Cost Local & Free Tier Architecture',
      reason: 'Strictly avoid external paid APIs by using local Ollama GPU/CPU models and verified free Kilo tiers',
      category: 'infrastructure',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'd-2',
      title: 'Human-in-the-Loop Dangerous Command Approval Gate',
      reason: 'Prevent unintended code execution and mutations by requiring explicit confirmation',
      category: 'security',
      timestamp: new Date().toISOString(),
    },
  ],
  leads: [
    { id: 'ld-1', name: 'Acme Software Corp', email: 'founders@acme.example', stage: 'negotiation', value: 2400 },
    { id: 'ld-2', name: 'DevFlow Studios', email: 'hello@devflow.example', stage: 'won', value: 4800 },
    { id: 'ld-3', name: 'HyperAI Labs', email: 'contact@hyperai.example', stage: 'lead', value: 1200 },
  ],
  artifacts: [
    { id: 'art-1', name: 'petros_architecture_report.md', path: 'docs/petros_architecture_report.md', category: 'architecture', createdAt: new Date().toISOString() },
  ],
  notes: [
    'Petros City combines Westworld luminous visual design with real autonomous startup execution capabilities.',
  ],
};

function getMemoryFilePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.petros_memory.json');
}

export function getProjectMemory(workspaceRoot: string): ProjectMemory {
  const file = getMemoryFilePath(workspaceRoot);
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { ...DEFAULT_MEMORY, ...data };
    }
  } catch {}
  return DEFAULT_MEMORY;
}

export function saveProjectMemory(workspaceRoot: string, update: Partial<ProjectMemory>): ProjectMemory {
  const current = getProjectMemory(workspaceRoot);
  const updated: ProjectMemory = {
    ...current,
    ...update,
    startup: {
      ...current.startup,
      ...(update.startup || {}),
      updatedAt: new Date().toISOString(),
    },
  };

  const file = getMemoryFilePath(workspaceRoot);
  try {
    fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8');
  } catch (err: any) {
    console.error('Failed to save project memory:', err?.message);
  }
  return updated;
}

export function formatMemoryContextForPrompt(workspaceRoot: string): string {
  const mem = getProjectMemory(workspaceRoot);
  const su = mem.startup;
  const recentDecisions = mem.decisions.slice(-5).map(d => `- [${d.category}] ${d.title}: ${d.reason}`).join('\n');
  const activeMilestones = mem.milestones.filter(m => !m.done).slice(0, 4).map(m => `- [${m.category}] ${m.title}`).join('\n');

  return `=== PETROS PERSISTENT PROJECT MEMORY (ACTIVE STARTUP CONTEXT) ===
Startup Name: ${su.name}
Industry: ${su.industry} | Model: ${su.businessModel} | Stage: ${su.stage}
Value Proposition: ${su.valueProp}
Target Customer: ${su.targetCustomer}

Recent Project Decisions:
${recentDecisions || 'None recorded yet.'}

Active Milestones:
${activeMilestones || 'All key milestones achieved.'}
==================================================================`;
}

export function recordStartupDecision(
  workspaceRoot: string,
  title: string,
  reason: string,
  category: string = 'architecture'
): ProjectMemory {
  const mem = getProjectMemory(workspaceRoot);
  const newDecision = {
    id: `d-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title,
    reason,
    category,
    timestamp: new Date().toISOString(),
  };
  return saveProjectMemory(workspaceRoot, {
    decisions: [...mem.decisions, newDecision],
  });
}

