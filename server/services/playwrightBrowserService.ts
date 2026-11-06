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

  public async search(query: string, timeoutMs: number = 25000): Promise<SearchResult> {
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

  public async screenshot(url: string, outputPath: string = 'public/screenshots/capture.png'): Promise<ScreenshotResult> {
    return new Promise((resolve) => {
      execFile(
        'python',
        [this.scriptPath, '--action', 'screenshot', '--url', url, '--output', outputPath],
        { timeout: 30000 },
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
}

export const playwrightBrowser = PlaywrightBrowserService.getInstance();
