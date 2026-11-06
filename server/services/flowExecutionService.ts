export interface FlowNode {
  id: string;
  type: 'trigger' | 'agent' | 'action' | 'condition' | 'approval';
  title: string;
  description: string;
  config: Record<string, any>;
  status: 'idle' | 'running' | 'success' | 'failed' | 'waiting_approval';
  lastRunAt?: string;
  output?: any;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
  updatedAt: string;
}

export interface FlowRunLog {
  id: string;
  flowId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'completed' | 'paused_approval' | 'failed';
  executedSteps: { nodeId: string; title: string; output: any; durationMs: number }[];
  error?: string;
}

export const SAMPLE_FLOWS: FlowDefinition[] = [
  {
    id: 'flow-startup-onboarding',
    name: 'Autonomous Startup Launch Flow',
    description: 'Triggered on new startup idea: executes market research, designs pricing tiers, generates MVP, and notifies founder.',
    enabled: true,
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-1',
        type: 'trigger',
        title: 'New Startup Idea Submitted',
        description: 'Fires when founder prompts Laya with a product vision',
        config: { event: 'laya.prompt' },
        status: 'success',
        lastRunAt: new Date().toISOString(),
        output: { idea: 'Autonomous AI Coding and Operations Ecosystem' },
      },
      {
        id: 'node-2',
        type: 'agent',
        title: 'Executive Strategy Agent',
        description: 'Generates Lean Canvas, competitive moat, and target audience personas',
        config: { agentId: 'strategy', model: 'ollama' },
        status: 'success',
        lastRunAt: new Date().toISOString(),
        output: { moat: '100% Zero-Cost Local GPU Execution with Windows Supervisor Guardrails' },
      },
      {
        id: 'node-3',
        type: 'agent',
        title: 'Commerce Unit Economics Agent',
        description: 'Simulates CAC, LTV, pricing model, and revenue forecast',
        config: { model: 'saas', tierTarget: '$49/mo' },
        status: 'success',
        lastRunAt: new Date().toISOString(),
        output: { projectedMRR: '$4,900', ltvCacRatio: '4.8x' },
      },
      {
        id: 'node-4',
        type: 'approval',
        title: 'Human Approval Gate',
        description: 'Requires explicit confirmation before code generation and workspace mutation',
        config: { approver: 'Operator', requiredAction: 'RUN' },
        status: 'idle',
      },
      {
        id: 'node-5',
        type: 'action',
        title: 'Petros Windows Worker Code Engine',
        description: 'Scaffolds full-stack repository and automated test suites',
        config: { engine: 'kilo', freeModel: 'reflection/beam-free' },
        status: 'idle',
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2' },
      { id: 'e2-3', source: 'node-2', target: 'node-3' },
      { id: 'e3-4', source: 'node-3', target: 'node-4' },
      { id: 'e4-5', source: 'node-4', target: 'node-5' },
    ],
  },
  {
    id: 'flow-lead-growth',
    name: 'Growth & Inbound Lead Workflow',
    description: 'Captures incoming leads, scores company fit, creates CRM record, and generates personalized outreach email.',
    enabled: true,
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'g-1',
        type: 'trigger',
        title: 'Lead Form Submission',
        description: 'Inbound prospect submits interest form on App Factory landing page',
        config: { source: 'landing_page' },
        status: 'idle',
      },
      {
        id: 'g-2',
        type: 'agent',
        title: 'Marketing & Persona AI',
        description: 'Scores company size and drafts custom enterprise solution proposal',
        config: { agentId: 'growth' },
        status: 'idle',
      },
      {
        id: 'g-3',
        type: 'action',
        title: 'Record in Petros CRM',
        description: 'Adds prospect to pipeline with deal value and contact details',
        config: { stage: 'negotiation' },
        status: 'idle',
      },
    ],
    edges: [
      { id: 'eg-1', source: 'g-1', target: 'g-2' },
      { id: 'eg-2', source: 'g-2', target: 'g-3' },
    ],
  },
];

class FlowExecutionEngine {
  private static instance: FlowExecutionEngine;
  private flows: Map<string, FlowDefinition> = new Map();
  private logs: FlowRunLog[] = [];

  private constructor() {
    for (const f of SAMPLE_FLOWS) {
      this.flows.set(f.id, f);
    }
  }

  public static getInstance(): FlowExecutionEngine {
    if (!FlowExecutionEngine.instance) {
      FlowExecutionEngine.instance = new FlowExecutionEngine();
    }
    return FlowExecutionEngine.instance;
  }

  public getFlows(): FlowDefinition[] {
    return Array.from(this.flows.values());
  }

  public getFlow(id: string): FlowDefinition | undefined {
    return this.flows.get(id);
  }

  public async executeFlow(flowId: string, initialPayload: any = {}): Promise<FlowRunLog> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    const log: FlowRunLog = {
      id: `run_${Date.now()}`,
      flowId,
      startedAt: new Date().toISOString(),
      status: 'running',
      executedSteps: [],
    };

    let currentPayload = { ...initialPayload };

    for (const node of flow.nodes) {
      const t0 = Date.now();
      node.status = 'running';

      if (node.type === 'approval') {
        node.status = 'waiting_approval';
        log.status = 'paused_approval';
        log.executedSteps.push({
          nodeId: node.id,
          title: node.title,
          output: { message: 'Workflow paused waiting for human approval gate' },
          durationMs: Date.now() - t0,
        });
        break;
      }

      // Execute node logic deterministically
      const stepOutput = {
        executed: true,
        nodeType: node.type,
        timestamp: new Date().toISOString(),
        payload: currentPayload,
      };

      node.status = 'success';
      node.lastRunAt = new Date().toISOString();
      node.output = stepOutput;

      log.executedSteps.push({
        nodeId: node.id,
        title: node.title,
        output: stepOutput,
        durationMs: Date.now() - t0,
      });
    }

    if (log.status !== 'paused_approval') {
      log.status = 'completed';
    }
    log.finishedAt = new Date().toISOString();
    this.logs.unshift(log);
    if (this.logs.length > 50) this.logs.pop();

    return log;
  }

  public getLogs(): FlowRunLog[] {
    return this.logs;
  }
}

export const flowEngine = FlowExecutionEngine.getInstance();
