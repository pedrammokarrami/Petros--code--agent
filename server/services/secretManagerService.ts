/**
 * secretManagerService.ts
 * Enterprise-Grade AES-256-GCM Secret Management for Petros OS.
 * 
 * Rules:
 * - API keys are NEVER logged, printed to console, or sent in plaintext to frontend.
 * - Encrypted at rest using AES-256-GCM with unique 12-byte initialization vectors (IV) and 16-byte auth tags.
 * - Master key derived using PBKDF2 with 100,000 iterations.
 * - Strict wallet-level isolation: secrets are scoped per wallet address.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface EncryptedSecretRecord {
  ciphertext: string;
  iv: string;
  tag: string;
  maskedHint: string;
  provider: string;
  updatedAt: number;
}

export class SecretManagerService {
  private static instance: SecretManagerService;
  private readonly ALGORITHM = 'aes-256-gcm';
  private masterKey: Buffer;

  private constructor() {
    // Derive master key from system environment or machine salt
    const salt = process.env.PETROS_SALT || 'petros-production-security-salt-2026';
    const secret = process.env.APP_SECRET || process.env.PETROS_SECRET || 'petros-core-internal-aes-key-v1';
    this.masterKey = crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
  }

  public static getInstance(): SecretManagerService {
    if (!SecretManagerService.instance) {
      SecretManagerService.instance = new SecretManagerService();
    }
    return SecretManagerService.instance;
  }

  private getStorePath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.petros_secrets.enc.json');
  }

  private loadStore(workspaceRoot: string): Record<string, Record<string, EncryptedSecretRecord>> {
    const p = this.getStorePath(workspaceRoot);
    if (!fs.existsSync(p)) return {};
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return {};
    }
  }

  private saveStore(workspaceRoot: string, store: Record<string, Record<string, EncryptedSecretRecord>>): void {
    const p = this.getStorePath(workspaceRoot);
    fs.writeFileSync(p, JSON.stringify(store, null, 2), 'utf8');
  }

  public maskKey(rawKey: string): string {
    if (!rawKey || rawKey.length < 8) return '****';
    const prefix = rawKey.slice(0, 4);
    const suffix = rawKey.slice(-4);
    return `${prefix}...${suffix}`;
  }

  /**
   * Encrypts and stores an API key for a specific wallet and provider.
   */
  public storeSecret(
    workspaceRoot: string,
    walletAddress: string,
    provider: string,
    rawKey: string
  ): { success: boolean; maskedHint: string } {
    const trimmed = rawKey.trim();
    if (!trimmed) throw new Error('Cannot store empty secret');

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.masterKey, iv);

    let ciphertext = cipher.update(trimmed, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    const maskedHint = this.maskKey(trimmed);

    const store = this.loadStore(workspaceRoot);
    const wKey = walletAddress.toLowerCase();
    if (!store[wKey]) store[wKey] = {};

    store[wKey][provider.toLowerCase()] = {
      ciphertext,
      iv: iv.toString('hex'),
      tag,
      maskedHint,
      provider: provider.toLowerCase(),
      updatedAt: Date.now(),
    };

    this.saveStore(workspaceRoot, store);
    return { success: true, maskedHint };
  }

  /**
   * Retrieves and decrypts the secret in-memory for backend routing.
   * NEVER expose output of this function to client responses.
   */
  public getDecryptedSecret(
    workspaceRoot: string,
    walletAddress: string,
    provider: string
  ): string | null {
    const store = this.loadStore(workspaceRoot);
    const record = store[walletAddress.toLowerCase()]?.[provider.toLowerCase()];
    if (!record) return null;

    try {
      const iv = Buffer.from(record.iv, 'hex');
      const tag = Buffer.from(record.tag, 'hex');
      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(record.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return null;
    }
  }

  /**
   * Lists masked secrets for client display without exposing plaintexts.
   */
  public listMaskedSecrets(
    workspaceRoot: string,
    walletAddress: string
  ): Record<string, { provider: string; maskedHint: string; updatedAt: number }> {
    const store = this.loadStore(workspaceRoot);
    const userStore = store[walletAddress.toLowerCase()] || {};
    const out: Record<string, { provider: string; maskedHint: string; updatedAt: number }> = {};

    for (const [prov, rec] of Object.entries(userStore)) {
      out[prov] = {
        provider: rec.provider,
        maskedHint: rec.maskedHint,
        updatedAt: rec.updatedAt,
      };
    }
    return out;
  }
}

export const secretManager = SecretManagerService.getInstance();
