/**
 * Codebase retrieval index (agent memory).
 *
 * Implementation note (honest): this is a *lexical* BM25 index built in-process
 * with no external service and no model download, so it is deterministic and
 * works offline. Embedding/vector-DB retrieval can be layered on top later; the
 * interface (build / search / stats) stays the same.
 */
import fs from 'fs';
import path from 'path';

export interface IndexedChunk {
  file: string;
  line: number;
  kind: 'line-block';
  text: string;
}

export interface SearchHit {
  file: string;
  line: number;
  score: number;
  text: string;
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.cpp', '.cc', '.swift', '.java', '.json', '.md']);

const tokenize = (text: string): string[] =>
  (text.toLowerCase().match(/[a-z0-9_]{2,}/g) || []).slice(0, 80);

export class CodeIndex {
  private static instance: CodeIndex | null = null;
  private chunks: IndexedChunk[] = [];
  private df = new Map<string, number>();
  private builtAt: number | null = null;
  private root = '';

  static getInstance(): CodeIndex {
    if (!CodeIndex.instance) CodeIndex.instance = new CodeIndex();
    return CodeIndex.instance;
  }

  /** Rebuilds the index over the workspace; chunk = one code block of ~8 lines. */
  build(root: string, limitFiles = 600): { files: number; chunks: number; durationMs: number } {
    const started = Date.now();
    this.root = path.resolve(root);
    this.chunks = [];
    this.df.clear();
    let files = 0;

    const walk = (dir: string) => {
      if (files >= limitFiles) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (files >= limitFiles) return;
        if (IGNORED_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!CODE_EXT.has(path.extname(entry.name).toLowerCase())) continue;
        files++;
        let content: string;
        try {
          content = fs.readFileSync(full, 'utf8');
        } catch {
          continue;
        }
        if (content.includes('\u0000')) continue;
        const lines = content.split('\n');
        const rel = path.relative(this.root, full);
        for (let i = 0; i < lines.length; i += 8) {
          const text = lines.slice(i, i + 8).join('\n').trim();
          if (!text) continue;
          const chunk: IndexedChunk = { file: rel, line: i + 1, kind: 'line-block', text };
          this.chunks.push(chunk);
          for (const token of new Set(tokenize(text))) this.df.set(token, (this.df.get(token) || 0) + 1);
        }
      }
    };

    walk(this.root);
    this.builtAt = Date.now();
    return { files, chunks: this.chunks.length, durationMs: Date.now() - started };
  }

  /** BM25 retrieval over the indexed chunks. */
  search(query: string, limit = 8): SearchHit[] {
    const qTokens = [...new Set(tokenize(query))];
    if (!qTokens.length || !this.chunks.length) return [];
    const N = this.chunks.length;
    const k1 = 1.2;
    const b = 0.75;
    const avgLen = this.chunks.reduce((sum, c) => sum + tokenize(c.text).length, 0) / N;

    const hits: SearchHit[] = [];
    for (const chunk of this.chunks) {
      const tokens = tokenize(chunk.text);
      if (!tokens.length) continue;
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      let score = 0;
      for (const q of qTokens) {
        const f = tf.get(q) || 0;
        if (!f) continue;
        const df = this.df.get(q) || 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * tokens.length) / avgLen)));
      }
      if (score > 0) hits.push({ file: chunk.file, line: chunk.line, score: Number(score.toFixed(3)), text: chunk.text.slice(0, 400) });
    }

    return hits.sort((x, y) => y.score - x.score).slice(0, limit);
  }

  stats() {
    return {
      built: this.builtAt !== null,
      builtAt: this.builtAt,
      chunks: this.chunks.length,
      files: new Set(this.chunks.map((c) => c.file)).size,
      vocabulary: this.df.size,
      mode: 'bm25-lexical',
    };
  }
}
