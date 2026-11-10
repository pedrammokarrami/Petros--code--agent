import type { EnvironmentDefinition } from './EnvironmentRegistry';

export interface CachedEnvironment {
  id: string;
  version: string;
  status: 'ready' | 'downloading' | 'invalid';
  downloadedAt: number;
  assetUrls: string[];
}

const CACHE_NAME = 'petros-environments-v1';
const MANIFEST_KEY = 'petros_environment_manifest';

const readManifest = (): Record<string, CachedEnvironment> => {
  try { return JSON.parse(localStorage.getItem(MANIFEST_KEY) || '{}'); } catch { return {}; }
};
const writeManifest = (manifest: Record<string, CachedEnvironment>) => localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));

export async function getCachedEnvironment(environment: EnvironmentDefinition): Promise<CachedEnvironment | null> {
  const entry = readManifest()[environment.id];
  if (!entry || entry.version !== environment.packageVersion || entry.status !== 'ready') return null;
  if (environment.packageUrl && 'caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    if (!await cache.match(environment.packageUrl)) return null;
  }
  return entry;
}

export async function cacheEnvironment(environment: EnvironmentDefinition, onProgress?: (progress: number) => void): Promise<CachedEnvironment> {
  const manifest = readManifest();
  const downloading: CachedEnvironment = { id: environment.id, version: environment.packageVersion, status: 'downloading', downloadedAt: Date.now(), assetUrls: environment.packageUrl ? [environment.packageUrl] : [] };
  manifest[environment.id] = downloading; writeManifest(manifest); onProgress?.(8);
  try {
    if (environment.packageUrl && 'caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const response = await fetch(environment.packageUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Environment package returned ${response.status}`);
      await cache.put(environment.packageUrl, response.clone());
    }
    onProgress?.(72);
    const ready = { ...downloading, status: 'ready' as const, downloadedAt: Date.now() };
    manifest[environment.id] = ready; writeManifest(manifest); onProgress?.(100); return ready;
  } catch (error) {
    manifest[environment.id] = { ...downloading, status: 'invalid' }; writeManifest(manifest); throw error;
  }
}

export async function clearCachedEnvironment(id: string) {
  const manifest = readManifest(); delete manifest[id]; writeManifest(manifest);
}
