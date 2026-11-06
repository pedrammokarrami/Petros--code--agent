// esbuild imported dynamically on demand
import fs from 'fs';
import path from 'path';

export interface BuildValidationResult {
  valid: boolean;
  code: string;
  compiledJs?: string;
  previewHtml?: string;
  errors: { message: string; line?: number; column?: number }[];
  repaired: boolean;
  buildTimeMs: number;
}

export interface GeneratedApp {
  id: string;
  name: string;
  prompt: string;
  templateType: string;
  sourceCode: string;
  previewHtml: string;
  exportPath?: string;
  status: 'valid' | 'repaired' | 'failed';
  createdAt: string;
}

export class AppFactoryService {
  private static instance: AppFactoryService;

  public static getInstance(): AppFactoryService {
    if (!AppFactoryService.instance) {
      AppFactoryService.instance = new AppFactoryService();
    }
    return AppFactoryService.instance;
  }

  public async validateAndBuild(sourceCode: string, appName: string = 'Petros Generated App'): Promise<BuildValidationResult> {
    const startTime = Date.now();
    let currentCode = sourceCode;
    let repaired = false;

    // Step 1: Initial validation with esbuild transform
    let buildError: any = null;
    try {
      const result = await esbuild.transform(currentCode, {
        loader: 'tsx',
        target: 'es2022',
        jsx: 'transform',
      });
      const previewHtml = this.generatePreviewHtml(currentCode, appName);
      return {
        valid: true,
        code: currentCode,
        compiledJs: result.code,
        previewHtml,
        errors: [],
        repaired: false,
        buildTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      buildError = err;
    }

    // Step 2: Automated Repair Attempt if syntax failed
    const errors: { message: string; line?: number; column?: number }[] = [];
    if (buildError?.errors) {
      for (const e of buildError.errors) {
        errors.push({
          message: e.text,
          line: e.location?.line,
          column: e.location?.column,
        });
      }
    } else {
      errors.push({ message: String(buildError?.message || buildError) });
    }

    const autoFixedCode = this.attemptAutoRepair(currentCode, errors);
    if (autoFixedCode !== currentCode) {
      try {
        const retryResult = await esbuildMod.transform(autoFixedCode, {
          loader: 'tsx',
          target: 'es2022',
          jsx: 'transform',
        });
        const previewHtml = this.generatePreviewHtml(autoFixedCode, appName);
        return {
          valid: true,
          code: autoFixedCode,
          compiledJs: retryResult.code,
          previewHtml,
          errors,
          repaired: true,
          buildTimeMs: Date.now() - startTime,
        };
      } catch (retryErr: any) {
        // Repair was insufficient
      }
    }

    // Fallback: Wrap raw code into resilient HTML preview even if JSX had minor syntax defects
    return {
      valid: false,
      code: currentCode,
      previewHtml: this.generateErrorFallbackPreview(appName, errors),
      errors,
      repaired: false,
      buildTimeMs: Date.now() - startTime,
    };
  }

  private attemptAutoRepair(code: string, errors: { message: string; line?: number }[]): string {
    let repaired = code;

    // Balance tags: div, main, section, p, span, h1, h2, h3
    const tags = ['div', 'section', 'main', 'p', 'span', 'h1', 'h2', 'h3'];
    for (const tag of tags) {
      const openMatches = repaired.match(new RegExp(`<${tag}[^>]*>`, 'g')) || [];
      const closeMatches = repaired.match(new RegExp(`</${tag}>`, 'g')) || [];
      const diff = openMatches.length - closeMatches.length;
      if (diff > 0) {
        const closingSeq = `</${tag}>`.repeat(diff);
        if (repaired.includes(');')) {
          repaired = repaired.replace(');', `${closingSeq});`);
        } else if (repaired.includes(';')) {
          repaired = repaired.replace(/;(?=\s*\n*\s*})/, `${closingSeq};`);
        } else {
          repaired += `\n${closingSeq}`;
        }
      }
    }

    // Strip accidental stray semicolons inside JSX tags
    repaired = repaired.replace(/<([^>]+);([^>]*)>/g, '<$1$2>');

    return repaired;
  }

  public generatePreviewHtml(tsxCode: string, title: string): string {
    // Generate clean interactive HTML with Tailwind CDN, Lucide, and Babel standalone
    const safeCode = tsxCode
      .replace(/import\s+React.*?from\s+['"].*?['"];?/g, '')
      .replace(/import\s+\{.*?\}\s+from\s+['"]lucide-react['"];?/g, '')
      .replace(/export\s+default\s+function/, 'function App');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { background-color: #02040A; color: #E2E8F0; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${safeCode}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
  }

  private generateErrorFallbackPreview(title: string, errors: { message: string; line?: number }[]): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 p-8 font-mono text-xs">
  <div class="max-w-xl mx-auto border border-rose-500/40 bg-rose-950/20 p-6 rounded-2xl">
    <div class="flex items-center gap-2 text-rose-400 font-bold text-sm mb-3">
      <span>⚠️ App Factory Build Error: ${title}</span>
    </div>
    <p class="text-slate-400 text-xs mb-4">The generated code failed ESBuild syntax compilation and auto-repair.</p>
    <div class="space-y-2">
      ${errors.map(e => `<div class="p-2 bg-black/60 rounded text-rose-300">Line ${e.line || '?'}: ${e.message}</div>`).join('')}
    </div>
  </div>
</body>
</html>`;
  }

  public async exportProject(appId: string, sourceCode: string, workspaceRoot: string): Promise<string> {
    const appDir = path.join(workspaceRoot, 'apps', 'generated', appId);
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }
    const srcDir = path.join(appDir, 'src');
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }

    const packageJson = {
      name: appId,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^0.460.0',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.3.4',
        tailwindcss: '^3.4.16',
        vite: '^6.0.3',
      },
    };

    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8');
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), sourceCode, 'utf8');
    fs.writeFileSync(path.join(srcDir, 'main.tsx'), `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`, 'utf8');
    fs.writeFileSync(path.join(appDir, 'vite.config.ts'), `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`, 'utf8');
    fs.writeFileSync(path.join(appDir, 'index.html'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appId}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`, 'utf8');

    return appDir;
  }
}

export const appFactory = AppFactoryService.getInstance();
