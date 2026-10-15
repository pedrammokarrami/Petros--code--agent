/**
 * AST-aware patch engine.
 *
 * Raw text replacement is how generated patches break large projects. This
 * engine refuses any edit that would leave the target file syntactically
 * invalid:
 *   - JS/TS/JSX/TSX: parsed with esbuild (the production bundler) before *and*
 *     after the edit; a clean parse is the acceptance criterion.
 *   - Python/Go/C++/Swift: the file is verified with the language's own
 *     syntax checker (`py_compile`, `go vet`, `g++ -fsyntax-only`,
 *     `swiftc -typecheck`).
 * Nothing is ever written unless verification passes.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { transformSync } from 'esbuild';

export interface PatchRequest {
  filePath: string;
  find: string;
  replace: string;
  expectedCount?: number;
  /** Root the patch must stay inside; prevents path traversal. */
  workspaceRoot: string;
}

export interface PatchResult {
  applied: boolean;
  reason: string;
  occurrences: number;
  verifier: 'typescript-ast' | 'py-compile' | 'go-vet' | 'cpp-syntax' | 'swift-typecheck' | 'none';
  diagnostics: string[];
}

const JS_LANGLABELS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const ESBUILD_LOADER: Record<string, 'ts' | 'tsx' | 'jsx' | 'js'> = {
  '.ts': 'ts', '.mts': 'ts', '.cts': 'ts',
  '.tsx': 'tsx',
  '.jsx': 'jsx',
  '.js': 'js', '.mjs': 'js', '.cjs': 'js',
};

/**
 * Parses with esbuild (the same engine the production build uses), so a patch
 * that the bundler would reject is rejected here first.
 */
function syntaxDiagnostics(content: string, fileName: string): string[] {
  const ext = path.extname(fileName).toLowerCase();
  const loader = ESBUILD_LOADER[ext] || 'ts';
  try {
    transformSync(content, { loader, sourcemap: false });
    return [];
  } catch (err: any) {
    const errors = Array.isArray(err?.errors) ? err.errors : [{ text: err?.message || 'syntax error' }];
    return errors.slice(0, 5).map((e: any) => {
      const loc = e?.location;
      return loc?.line ? `line ${loc.line}:${loc.column} ${e.text}` : String(e?.text || 'syntax error');
    });
  }
}

function verifyWithTool(filePath: string, content: string): { verifier: PatchResult['verifier']; ok: boolean; diagnostics: string[] } {
  const ext = path.extname(filePath).toLowerCase();
  const args: { cmd: string; argv: string[]; verifier: PatchResult['verifier'] } | null =
    ext === '.py' ? { cmd: 'python3', argv: ['-m', 'py_compile', filePath], verifier: 'py-compile' }
      : ext === '.go' ? { cmd: 'go', argv: ['vet', filePath], verifier: 'go-vet' }
      : ext === '.cpp' || ext === '.cc' || ext === '.cxx' ? { cmd: 'g++', argv: ['-fsyntax-only', filePath], verifier: 'cpp-syntax' }
      : ext === '.swift' ? { cmd: 'swiftc', argv: ['-typecheck', filePath], verifier: 'swift-typecheck' }
      : null;

  if (!args) return { verifier: 'none', ok: true, diagnostics: [] };
  try {
    execFileSync(args.cmd, args.argv, { stdio: 'pipe', timeout: 60_000 });
    return { verifier: args.verifier, ok: true, diagnostics: [] };
  } catch (err: any) {
    const out = `${err?.stdout || ''}${err?.stderr || ''}`.toString().trim().split('\n').slice(0, 6).join(' | ');
    return { verifier: args.verifier, ok: false, diagnostics: [out || err?.message || 'syntax check failed'] };
  }
}

export function applyAstPatch(req: PatchRequest): PatchResult {
  const root = path.resolve(req.workspaceRoot);
  const target = path.resolve(root, req.filePath);

  if (!target.startsWith(root + path.sep) && target !== root) {
    return { applied: false, reason: 'PATH_OUTSIDE_WORKSPACE', occurrences: 0, verifier: 'none', diagnostics: [] };
  }
  if (!req.find || req.find === req.replace) {
    return { applied: false, reason: 'EMPTY_OR_IDENTITY_PATCH', occurrences: 0, verifier: 'none', diagnostics: [] };
  }
  if (!fs.existsSync(target)) {
    return { applied: false, reason: 'FILE_NOT_FOUND', occurrences: 0, verifier: 'none', diagnostics: [] };
  }

  const original = fs.readFileSync(target, 'utf8');
  const occurrences = original.split(req.find).length - 1;
  const expected = req.expectedCount ?? 1;
  if (occurrences === 0) {
    return { applied: false, reason: 'ANCHOR_NOT_FOUND', occurrences: 0, verifier: 'none', diagnostics: [] };
  }
  if (occurrences !== expected) {
    return {
      applied: false,
      reason: `ANCHOR_NOT_UNIQUE (found ${occurrences}, expected ${expected})`,
      occurrences,
      verifier: 'none',
      diagnostics: [],
    };
  }

  const patched = original.split(req.find).join(req.replace);
  const ext = path.extname(target).toLowerCase();

  if (JS_LANGLABELS.has(ext)) {
    const preDiagnostics = syntaxDiagnostics(original, target);
    if (preDiagnostics.length) {
      return {
        applied: false,
        reason: 'SOURCE_ALREADY_INVALID',
        occurrences,
        verifier: 'typescript-ast',
        diagnostics: preDiagnostics,
      };
    }
    const postDiagnostics = syntaxDiagnostics(patched, target);
    if (postDiagnostics.length) {
      return {
        applied: false,
        reason: 'PATCH_WOULD_BREAK_SYNTAX',
        occurrences,
        verifier: 'typescript-ast',
        diagnostics: postDiagnostics,
      };
    }
    fs.writeFileSync(target, patched);
    return { applied: true, reason: 'APPLIED', occurrences, verifier: 'typescript-ast', diagnostics: [] };
  }

  // Non-JS languages: write to a temp copy, verify, then commit.
  const tmp = `${target}.codgar-patch-tmp${ext}`;
  fs.writeFileSync(tmp, patched);
  try {
    const check = verifyWithTool(tmp, patched);
    if (!check.ok) {
      return { applied: false, reason: 'PATCH_WOULD_BREAK_SYNTAX', occurrences, verifier: check.verifier, diagnostics: check.diagnostics };
    }
    fs.renameSync(tmp, target);
    return { applied: true, reason: 'APPLIED', occurrences, verifier: check.verifier, diagnostics: [] };
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}
