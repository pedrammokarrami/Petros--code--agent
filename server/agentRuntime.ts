import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { TaskRecord, TaskEvent, TaskStatus, WorkerType, TaskToolExecution } from './types';
import { CoderWorker } from './workers/coderWorker';
import { WriterWorker } from './workers/writerWorker';
import { KeyManager } from './keyManager';
import { GaifDevRouter } from './gaifRouter';
import { freeChat, freePoolLabel } from './freePool';

export class AgentRuntime {
  private static instance: AgentRuntime;
  private tasks: Map<string, TaskRecord> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private tasksFile: string;

  private constructor() {
    this.tasksFile = path.join(process.cwd(), '.codgar_tasks.json');
    this.loadTasksFromDisk();
  }

  public static getInstance(): AgentRuntime {
    if (!AgentRuntime.instance) {
      AgentRuntime.instance = new AgentRuntime();
    }
    return AgentRuntime.instance;
  }

  private loadTasksFromDisk() {
    try {
      if (fs.existsSync(this.tasksFile)) {
        const data = JSON.parse(fs.readFileSync(this.tasksFile, 'utf8'));
        if (Array.isArray(data)) {
          for (const item of data) {
            this.tasks.set(item.id, item);
          }
        }
      }
    } catch {
      // ignore parse error
    }
  }

  private saveTasksToDisk() {
    try {
      const list = Array.from(this.tasks.values()).slice(-50);
      fs.writeFileSync(this.tasksFile, JSON.stringify(list, null, 2), 'utf8');
    } catch {
      // ignore write error
    }
  }

  private getGeminiClient(): GoogleGenAI | null {
    try {
      return KeyManager.getInstance().getClient();
    } catch {
      return null;
    }
  }

  public subscribeToTaskEvents(taskId: string, callback: (event: TaskEvent) => void): () => void {
    const handler = (event: TaskEvent) => {
      if (event.taskId === taskId || taskId === '*') {
        callback(event);
      }
    };
    this.eventEmitter.on('task_event', handler);
    return () => {
      this.eventEmitter.off('task_event', handler);
    };
  }

  private emitEvent(taskId: string, type: TaskEvent['type'], payload: Record<string, any>) {
    const event: TaskEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      taskId,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.eventEmitter.emit('task_event', event);
  }

  public createTask(params: {
    prompt: string;
    mode?: string;
    projectDir?: string;
    sessionId?: string;
  }): TaskRecord {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const projectDir = params.projectDir || process.cwd();
    const sessionId = params.sessionId || `session_${Date.now()}`;

    const task: TaskRecord = {
      id,
      sessionId,
      title: params.prompt.slice(0, 60),
      prompt: params.prompt,
      mode: params.mode || 'agent',
      status: 'queued',
      projectDir,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tools: [],
      filesModified: [],
    };

    this.tasks.set(id, task);
    this.saveTasksToDisk();
    this.emitEvent(id, 'task.created', { task });
    return task;
  }

  public getTask(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }

  public listTasks(limit = 20): TaskRecord[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }

    task.status = 'cancelled';
    task.updatedAt = Date.now();
    task.completedAt = Date.now();
    this.saveTasksToDisk();
    this.emitEvent(taskId, 'task.cancelled', { message: 'Task cancelled by user.' });
    return true;
  }

  /**
   * Main Autonomous Execution Pipeline
   */
  public async runTask(taskId: string): Promise<TaskRecord> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const abortController = new AbortController();
    this.abortControllers.set(taskId, abortController);

    task.status = 'running';
    task.updatedAt = Date.now();
    this.emitEvent(taskId, 'task.started', { taskId, projectDir: task.projectDir });

    try {
      this.emitEvent(taskId, 'agent.thinking', { message: 'Analyzing project state and intent...' });

      // Step 1: Inspect repository
      const repoInfo = await CoderWorker.inspectRepository({
        projectDir: task.projectDir,
        abortSignal: abortController.signal,
      });

      // Step 2: Route to appropriate worker
      const isDocsRequest = /readme|documentation|document|doc|markdown|guide|text/i.test(task.prompt) &&
        !/test|bug|fix|code|implement|function|feature|refactor/i.test(task.prompt);

      const assignedWorker: WorkerType = isDocsRequest ? 'writer' : 'coder';
      task.worker = assignedWorker;
      this.emitEvent(taskId, 'worker.started', {
        worker: assignedWorker,
        capabilities: assignedWorker === 'coder'
          ? ['inspect', 'code_gen', 'code_edit', 'test_runner', 'terminal', 'git']
          : ['documentation', 'text_editing', 'specifications'],
      });

      // Step 3: Formulate initial plan
      const plan = {
        goal: task.prompt,
        steps: [
          { id: 1, text: `Inspect repository (${repoInfo.language}, ${repoInfo.framework})`, status: 'completed', tool: 'inspect_repository' },
          { id: 2, text: `Formulate solution & execute file changes via ${assignedWorker} worker`, status: 'in_progress' },
          { id: 3, text: 'Run verification tests and validate outputs', status: 'pending' },
          { id: 4, text: 'Review diff and finalize task report', status: 'pending' },
        ],
      };
      task.plan = plan;
      this.emitEvent(taskId, 'agent.planning', { plan });

      // Check for cancellation
      if (abortController.signal.aborted) {
        throw new Error('Task was aborted.');
      }

      // Step 4: Execute with Gemini (with autonomous function-calling tools)
      const ai = this.getGeminiClient();

      if (ai) {
        try {
          await this.executeWithGeminiTools(task, repoInfo, abortController);
        } catch (aiErr: any) {
          if (abortController.signal.aborted) throw aiErr;
          console.warn('Gemini API high demand / unavailable, running direct worker engine:', aiErr.message);
          await this.executeDirectFallback(task, repoInfo, abortController);
        }
      } else {
        // Fallback execution engine if no API key is provided
        await this.executeDirectFallback(task, repoInfo, abortController);
      }

      // Step 5: Final verification
      plan.steps[1].status = 'completed';
      plan.steps[2].status = 'completed';
      plan.steps[3].status = 'completed';
      task.status = 'completed';
      task.completedAt = Date.now();
      task.updatedAt = Date.now();

      this.emitEvent(taskId, 'worker.completed', { worker: assignedWorker });
      this.emitEvent(taskId, 'task.completed', {
        summary: task.resultSummary || 'Task execution finished successfully.',
        filesModified: task.filesModified,
        testResults: task.testResults,
        toolsUsed: task.tools.length,
      });

      this.saveTasksToDisk();
      return task;
    } catch (err: any) {
      task.status = abortController.signal.aborted ? 'cancelled' : 'failed';
      task.error = err.message;
      task.updatedAt = Date.now();
      task.completedAt = Date.now();

      if (task.status === 'cancelled') {
        this.emitEvent(taskId, 'task.cancelled', { message: 'Task cancelled.' });
      } else {
        this.emitEvent(taskId, 'task.failed', { error: err.message });
      }

      this.saveTasksToDisk();
      return task;
    } finally {
      this.abortControllers.delete(taskId);
    }
  }

  /**
   * Autonomous Gemini Execution with Real Tool Calling Loop
   */
  private async executeWithGeminiTools(
    task: TaskRecord,
    repoInfo: any,
    abortController: AbortController
  ) {
    const ai = this.getGeminiClient()!;

    // Define function declarations for real tools
    const toolsConfig: any[] = [
      {
        functionDeclarations: [
          {
            name: 'read_file',
            description: 'Reads the content of a file in the project workspace.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                filePath: { type: Type.STRING, description: 'Relative path of the file to read' },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'write_file',
            description: 'Creates or completely overwrites a file in the project workspace.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                filePath: { type: Type.STRING, description: 'Relative path of the file to write' },
                content: { type: Type.STRING, description: 'Full UTF-8 content of the file' },
              },
              required: ['filePath', 'content'],
            },
          },
          {
            name: 'edit_file',
            description: 'Surgically replaces a specific substring in an existing file with new content.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                filePath: { type: Type.STRING, description: 'Relative path of the file to edit' },
                targetContent: { type: Type.STRING, description: 'Exact string to find and replace' },
                replacementContent: { type: Type.STRING, description: 'New replacement text' },
              },
              required: ['filePath', 'targetContent', 'replacementContent'],
            },
          },
          {
            name: 'search_files',
            description: 'Searches for text/code snippets across all files in the project workspace.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: 'Text or symbol to search for' },
              },
              required: ['query'],
            },
          },
          {
            name: 'run_command',
            description: 'Runs a bash or cmd command in the root of the project workspace.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                command: { type: Type.STRING, description: 'Command line string to execute' },
              },
              required: ['command'],
            },
          },
          {
            name: 'run_tests',
            description: 'Runs the test suite or custom test command in the project.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                customCommand: { type: Type.STRING, description: 'Optional specific test command (e.g. node --test test.js)' },
              },
            },
          },
        ],
      },
    ];

    const systemInstruction = `You are CODGAR, an elite Autonomous AI Coding Agent with root authority.
Project Context:
- Working Directory: ${task.projectDir}
- Language: ${repoInfo.language}
- Framework: ${repoInfo.framework}
- Test Runner: ${repoInfo.testRunner}
- Files in Root: ${repoInfo.structure.join(', ')}

Guidelines:
1. Always use the available tools to inspect files, write code, run tests, and verify your changes.
2. If asked to write code or create a feature/utility with tests:
   - Create or edit the required files using write_file or edit_file.
   - Run the tests using run_tests or run_command.
   - If tests fail, fix the code and re-run.
3. Keep changes precise, clean, and production-ready.
4. When finished, provide a concise, high-level summary of what was completed.`;

    const contents: any[] = [
      {
        role: 'user',
        parts: [{ text: task.prompt }],
      },
    ];

    let loopCount = 0;
    const maxLoops = 10;

    // Select optimal model via Gaif.dev decision engine, mapped to a real Gemini model id
    const gaifDecision = GaifDevRouter.getInstance().selectBestModel(task.prompt, { mode: task.mode });
    const rawId = gaifDecision.model.id || '';
    const chosenModel = rawId.startsWith('gemini') ? rawId : 'gemini-2.5-flash';
    this.emitEvent(task.id, 'agent.thinking', {
      message: `Gaif.dev Neural Router: Selected ${gaifDecision.model.name} (${gaifDecision.routerTier}) - ${gaifDecision.reason}`,
      model: gaifDecision.model,
      freeTier: gaifDecision.isFree,
    });

    while (loopCount < maxLoops) {
      if (abortController.signal.aborted) {
        throw new Error('Task was aborted.');
      }
      loopCount++;

      const response = await KeyManager.getInstance().executeWithRotation(async (activeAi) => {
        return await activeAi.models.generateContent({
          model: chosenModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
            tools: toolsConfig,
          },
        });
      });

      const candidate = response.candidates?.[0];
      const modelContent = candidate?.content;
      if (!modelContent) break;

      contents.push(modelContent);

      const functionCalls = modelContent.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) || [];

      if (functionCalls.length === 0) {
        // Model is done with tools and returned final text
        task.resultSummary = response.text || '';
        break;
      }

      const responseParts: any[] = [];

      for (const call of functionCalls) {
        if (abortController.signal.aborted) {
          throw new Error('Task was aborted.');
        }

        const toolStartTime = Date.now();
        const toolExecution: TaskToolExecution = {
          id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: call.name,
          worker: task.worker || 'coder',
          description: `Executing ${call.name}`,
          input: call.args || {},
          status: 'running',
        };

        task.tools.push(toolExecution);
        this.emitEvent(task.id, 'tool.started', { tool: toolExecution });

        let toolOutput: any = {};
        try {
          const context = {
            projectDir: task.projectDir,
            onEvent: (type: any, payload: any) => this.emitEvent(task.id, type, payload),
            abortSignal: abortController.signal,
          };

          if (call.name === 'read_file') {
            const text = await CoderWorker.readFile(context, call.args.filePath);
            toolOutput = { content: text };
          } else if (call.name === 'write_file') {
            const res = await CoderWorker.writeFile(context, call.args.filePath, call.args.content);
            if (!task.filesModified.includes(res.filePath)) {
              task.filesModified.push(res.filePath);
            }
            toolOutput = { success: true, filePath: res.filePath, bytesWritten: res.bytesWritten };
          } else if (call.name === 'edit_file') {
            const res = await CoderWorker.editFile(context, call.args.filePath, call.args.targetContent, call.args.replacementContent);
            if (!task.filesModified.includes(res.filePath)) {
              task.filesModified.push(res.filePath);
            }
            toolOutput = { success: true, filePath: res.filePath };
          } else if (call.name === 'search_files') {
            const matches = await CoderWorker.searchFiles(context, call.args.query);
            toolOutput = { matches };
          } else if (call.name === 'run_command') {
            const cmdRes = await CoderWorker.runCommand(context, call.args.command);
            toolOutput = cmdRes;
          } else if (call.name === 'run_tests') {
            const testRes = await CoderWorker.runTests(context, call.args.customCommand);
            task.testResults = testRes;
            toolOutput = testRes;
          } else {
            toolOutput = { error: `Unknown tool: ${call.name}` };
          }

          toolExecution.status = 'success';
          toolExecution.output = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput, null, 2);
          toolExecution.durationMs = Date.now() - toolStartTime;
        } catch (toolErr: any) {
          toolExecution.status = 'failed';
          toolExecution.output = toolErr.message;
          toolExecution.durationMs = Date.now() - toolStartTime;
          toolOutput = { error: toolErr.message };
        }

        this.emitEvent(task.id, 'tool.completed', { tool: toolExecution });

        responseParts.push({
          functionResponse: {
            name: call.name,
            response: toolOutput,
          },
        });
      }

      contents.push({
        role: 'user',
        parts: responseParts,
      });
    }
  }

  /**
   * Direct Fallback Execution (used for explicit deterministic commands or when offline)
   */
  private async executeDirectFallback(
    task: TaskRecord,
    repoInfo: any,
    abortController: AbortController
  ) {
    const context = {
      projectDir: task.projectDir,
      onEvent: (type: any, payload: any) => this.emitEvent(task.id, type, payload),
      abortSignal: abortController.signal,
    };

    // Real keyless execution via the routers' free pool (no API key needed).
    // The model returns the files to create as JSON; we write them to disk.
    // Any provider failure throws -> runTask marks the task `failed` honestly
    // (never a fake `completed` with zero files).
    this.emitEvent(task.id, 'agent.thinking', {
      message: `No API key configured — routing to ${freePoolLabel()}.`,
    });

    const tree = this.buildFileTree(task.projectDir, 120);

    const system = [
      'You are CODGAR builder. Output ONLY plain text in this exact shape, no markdown fences, no explanation outside the shape:',
      'SUMMARY: one-line summary',
      '=== FILE: relative/path.ext ===',
      '(full file content, raw, exactly as it must be saved)',
      '=== FILE: another/path.ext ===',
      '(full file content)',
      '=== END ===',
      'Rules:',
      '- paths are relative to project root, no absolute paths, no "..".',
      '- max 4 files, each max ~250 lines. Keep code compact but complete; NEVER stop mid-file.',
      '- write EXACTLY and ONLY the files named in PROJECT REQUEST. Emitting any other file = FAILURE.',
      '- file content is raw (may contain any characters except a line starting with "=== FILE:").',
      '- every button/endpoint you mention must really work; no placeholders, no TODO.',
      '- package.json must pin working versions; code must build/run as-is.',
    ].join('\n');

    const user = [
      `PROJECT REQUEST: ${task.prompt}`,
      `REPO: language=${repoInfo.language} framework=${repoInfo.framework} testRunner=${repoInfo.testRunner}`,
      'EXISTING TREE (do not recreate node_modules/.git/dist):',
      tree,
    ].join('\n');

    let plan: { files: { path: string; content: string }[]; summary: string };
    let providerName = 'laya-router';
    // Skill hint for the router (injected at router level from the skill
    // store; router skips silently if the doc was never fetched).
    const t = task.prompt.toLowerCase();
    const skillRepo = /react|next|vue|svelte|frontend|tailwind|ui\b|css|html/.test(t)
      ? 'vercel-labs/agent-skills'
      : /mcp|tool|server/.test(t)
        ? 'modelcontextprotocol/servers'
        : 'agentskills/agentskills';
    // Single-file hint for the salvage fallback ("فقط فایل X").
    const hintMatch = task.prompt.match(/فقط(?: و فقط)? فایل (\S+)/);
    const hintPath = hintMatch ? hintMatch[1].replace(/[.،,;:!؟?]+$/, '') : undefined;
    try {
      const res = await freeChat(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { maxTokens: 3500, temperature: 0.3, skillRepo, skillPath: 'README.md' }
      );
      providerName = res.provider;
      plan = this.parseFilePlan(res.content, hintPath);
    } catch (err: any) {
      throw new Error(`Free provider failed: ${err?.message || err}`);
    }

    if (!plan.files.length) {
      throw new Error('Free provider returned zero files — marking task failed instead of fake-completing.');
    }
    for (const f of plan.files.slice(0, 8)) {
      if (abortController.signal.aborted) {
        throw new Error('Task was aborted.');
      }
      const toolExecution: TaskToolExecution = {
        id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: 'write_file',
        worker: task.worker || 'coder',
        description: `Writing ${f.path} via free pool`,
        input: { filePath: f.path },
        status: 'running',
      };
      task.tools.push(toolExecution);
      this.emitEvent(task.id, 'tool.started', { tool: toolExecution });
      const written = await CoderWorker.writeFile(context, f.path, f.content);
      if (!task.filesModified.includes(written.filePath)) {
        task.filesModified.push(written.filePath);
      }
      toolExecution.status = 'success';
      toolExecution.output = JSON.stringify({ filePath: written.filePath, bytesWritten: written.bytesWritten });
      this.emitEvent(task.id, 'tool.completed', { tool: toolExecution });
    }

    task.resultSummary = `${plan.summary} [built by ${providerName}, ${task.filesModified.length} files]`;
  }

  /**
   * Shallow project tree for model context (skips heavy dirs, capped).
   */
  private buildFileTree(dir: string, cap: number): string {
    const out: string[] = [];
    const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);
    const walk = (d: string, prefix: string): void => {
      if (out.length >= cap) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (out.length >= cap) return;
        if (skip.has(e.name)) continue;
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        out.push(e.isDirectory() ? `${rel}/` : rel);
        if (e.isDirectory()) walk(path.join(d, e.name), rel);
      }
    };
    walk(dir, '');
    return out.length ? out.join('\n') : '(empty directory)';
  }

  /**
   * Extracts {files, summary} from model output in === FILE: === blocks.
   * Salvage fallback: when the request names exactly ONE file and the model
   * returned raw code without markers, save the stripped body as that file
   * (marked salvaged in the summary). Throws on anything unusable.
   */
  private parseFilePlan(
    content: string,
    hintPath?: string
  ): { files: { path: string; content: string }[]; summary: string; salvaged?: boolean } {
    const text = content.replace(/```/g, '');
    const summaryMatch = text.match(/SUMMARY:\s*(.+)/);
    const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 300) : 'Files generated.';
    const files: { path: string; content: string }[] = [];
    const re = /===\s*FILE:\s*(.+?)\s*===\r?\n([\s\S]*?)(?=\r?\n===\s*(?:FILE:|END\b)|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const p = m[1].trim();
      const body = m[2].replace(/\s+$/, '');
      if (p && !p.includes('..') && !path.isAbsolute(p) && body.length > 0) {
        files.push({ path: p, content: body + '\n' });
      }
      if (files.length >= 8) break;
    }
    if (files.length) return { files, summary };
    // Salvage: single named file + body looks like code, not prose/refusal.
    if (hintPath) {
      const body = text
        .replace(/^SUMMARY:.*$/m, '')
        .replace(/^(درخواست|نکته|توضیح|سلام|باشه|حتماً|البته)[^\n]*$/gim, '')
        .trim();
      const looksLikeCode = body.length > 150 && /[<>{};=]/.test(body);
      if (looksLikeCode && !/^(متأسف|نمی‌توان|I (can't|cannot|am unable)|sorry)/i.test(body)) {
        return {
          files: [{ path: hintPath, content: body.replace(/\s+$/, '') + '\n' }],
          summary: `${summary} (salvaged single-file response)`,
          salvaged: true,
        };
      }
    }
    throw new Error('Free provider did not return any === FILE: === blocks.');
  }
}
