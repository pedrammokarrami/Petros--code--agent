import { execFile } from 'child_process';
import path from 'path';

export interface NavigationResult {
  success: boolean;
  title?: string;
  url?: string;
  status?: number;
  snippet?: string;
  links?: { href: string; text: string }[];
  error?: string;
}

export interface SearchResult {
  success: boolean;
  query?: string;
  results?: { title: string; snippet: string; url: string }[];
  error?: string;
}

export interface ScreenshotResult {
  success: boolean;
  url?: string;
  screenshotPath?: string;
  error?: string;
}

export interface InteractResult {
  success: boolean;
  action?: string;
  selector?: string;
  currentUrl?: string;
  title?: string;
  error?: string;
}

export interface ExtractResult {
  success: boolean;
  url?: string;
  title?: string;
  headings?: string[];
  summary?: string;
  error?: string;
}

export class PlaywrightBrowserService {
  private static instance: PlaywrightBrowserService;
  private scriptPath: string;

  private constructor() {
    this.scriptPath = path.resolve(process.cwd(), 'scripts', 'playwright_runner.py');
  }

  public static getInstance(): PlaywrightBrowserService {
    if (!PlaywrightBrowserService.instance) {
      PlaywrightBrowserService.instance = new PlaywrightBrowserService();
    }
    return PlaywrightBrowserService.instance;
  }

  public async navigate(url: string, timeoutMs: number = 25000): Promise<NavigationResult> {
    return new Promise((resolve) => {
      execFile(
        'python',
        [this.scriptPath, '--action', 'navigate', '--url', url],
        { timeout: timeoutMs },
        (error, stdout, stderr) => {
          if (error) {
            return resolve({ success: false, error: error.message || stderr });
          }
          try {
            const data = JSON.parse(stdout.trim());
            resolve(data);
          } catch (e: any) {
            resolve({ success: false, error: `Invalid JSON response: ${stdout}` });
          }
        }
      );
    });
  }

  public async search(query: string, timeoutMs: number = 20000): Promise<SearchResult> {
    return new Promise((resolve) => {
      execFile(
        'python',
        [this.scriptPath, '--action', 'search', '--query', query],
        { timeout: timeoutMs },
        (error, stdout, stderr) => {
          if (error) {
            return resolve({ success: false, error: error.message || stderr });
          }
          try {
            const data = JSON.parse(stdout.trim());
            resolve(data);
          } catch (e: any) {
            resolve({ success: false, error: `Invalid JSON response: ${stdout}` });
          }
        }
      );
    });
  }

  public async screenshot(url: string, outputPath: string, timeoutMs: number = 25000): Promise<ScreenshotResult> {
    return new Promise((resolve) => {
      execFile(
        'python',
        [this.scriptPath, '--action', 'screenshot', '--url', url, '--output', outputPath],
        { timeout: timeoutMs },
        (error, stdout, stderr) => {
          if (error) {
            return resolve({ success: false, error: error.message || stderr });
          }
          try {
            const data = JSON.parse(stdout.trim());
            resolve(data);
          } catch (e: any) {
            resolve({ success: false, error: `Invalid JSON response: ${stdout}` });
          }
        }
      );
    });
  }

  public async interact(
    url: string,
    selector: string,
    actionType: 'click' | 'fill' | 'press' = 'click',
    text: string = '',
    timeoutMs: number = 25000
  ): Promise<InteractResult> {
    return new Promise((resolve) => {
      execFile(
        'python',
        [this.scriptPath, '--action', 'interact', '--url', url, '--selector', selector, '--type', actionType, '--text', text],
        { timeout: timeoutMs },
        (error, stdout, stderr) => {
          if (error) {
            return resolve({ success: false, error: error.message || stderr });
          }
          try {
            const data = JSON.parse(stdout.trim());
            resolve(data);
          } catch (e: any) {
            resolve({ success: false, error: `Invalid JSON response: ${stdout}` });
          }
        }
      );
    });
  }

  public async extract(url: string, timeoutMs: number = 25000): Promise<ExtractResult> {
    return new Promise((resolve) => {
      execFile(
        'python',
        [this.scriptPath, '--action', 'extract', '--url', url],
        { timeout: timeoutMs },
        (error, stdout, stderr) => {
          if (error) {
            return resolve({ success: false, error: error.message || stderr });
          }
          try {
            const data = JSON.parse(stdout.trim());
            resolve(data);
          } catch (e: any) {
            resolve({ success: false, error: `Invalid JSON response: ${stdout}` });
          }
        }
      );
    });
  }

  public async proxyFetch(targetUrl: string): Promise<{ success: boolean; content?: string; error?: string; contentType?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);

      const contentType = res.headers.get('content-type') || 'text/html';
      const text = await res.text();

      // Inject base tag so relative links and assets resolve to the target host
      const baseTag = `<base href="${targetUrl}">`;
      let sanitized = text;
      if (sanitized.includes('<head>')) {
        sanitized = sanitized.replace('<head>', `<head>${baseTag}`);
      } else if (sanitized.includes('<html>')) {
        sanitized = sanitized.replace('<html>', `<html><head>${baseTag}</head>`);
      } else {
        sanitized = `${baseTag}${sanitized}`;
      }

      return {
        success: true,
        content: sanitized,
        contentType,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const playwrightBrowser = PlaywrightBrowserService.getInstance();
