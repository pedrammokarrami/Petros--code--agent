/**
 * walletAuthService.ts
 * Cryptographic Wallet Authentication & Session Management for Petros OS.
 * 
 * Open-Source Standard Reused:
 * - ethers (MIT License) - EIP-191 personal_sign cryptographic message verification.
 * - EIP-4361 (Sign-In with Ethereum / Wallet Challenge Nonce) pattern.
 * 
 * Rules:
 * - Never store plaintext private keys or seed phrases on the backend.
 * - A wallet address alone is NOT proof of ownership; cryptographic signature is mandatory.
 * - Nonce replay protection with 5-minute expiration.
 * - 1 Authenticated Wallet = 1 User Profile = 1 Active Project.
 */

import { verifyMessage, getAddress } from 'ethers';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface WalletSession {
  sessionId: string;
  walletAddress: string;
  createdAt: number;
  expiresAt: number;
  projectSlug: string;
}

export interface AuthChallenge {
  nonce: string;
  timestamp: number;
  statement: string;
}

export class WalletAuthService {
  private static instance: WalletAuthService;
  private pendingNonces = new Map<string, { nonce: string; timestamp: number }>();
  private activeSessions = new Map<string, WalletSession>();
  private readonly NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {}

  public static getInstance(): WalletAuthService {
    if (!WalletAuthService.instance) {
      WalletAuthService.instance = new WalletAuthService();
    }
    return WalletAuthService.instance;
  }

  /**
   * Generates a cryptographic authentication challenge for a given wallet address.
   */
  public generateChallenge(address: string): { challengeMessage: string; nonce: string; timestamp: number } {
    let cleanAddress: string;
    try {
      cleanAddress = getAddress(address);
    } catch {
      throw new Error('Invalid Ethereum wallet address format');
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    this.pendingNonces.set(cleanAddress.toLowerCase(), { nonce, timestamp });

    const challengeMessage = 
`Sign in to Petros OS
Wallet: ${cleanAddress}
Nonce: ${nonce}
Issued At: ${new Date(timestamp).toISOString()}
Notice: By signing, you authenticate access to your single Petros autonomous project.`;

    return { challengeMessage, nonce, timestamp };
  }

  /**
   * Verifies the cryptographic signature against the pending challenge.
   */
  public verifySignature(claimedAddress: string, signature: string, customMessage?: string): WalletSession {
    let cleanAddress: string;
    try {
      cleanAddress = getAddress(claimedAddress);
    } catch {
      throw new Error('Invalid Ethereum wallet address format');
    }

    const key = cleanAddress.toLowerCase();
    const pending = this.pendingNonces.get(key);
    if (!pending) {
      throw new Error('No pending authentication challenge found for this address. Please request a new nonce.');
    }

    if (Date.now() - pending.timestamp > this.NONCE_TTL_MS) {
      this.pendingNonces.delete(key);
      throw new Error('Authentication challenge has expired. Please request a new nonce.');
    }

    const expectedMessage = customMessage || 
`Sign in to Petros OS
Wallet: ${cleanAddress}
Nonce: ${pending.nonce}
Issued At: ${new Date(pending.timestamp).toISOString()}
Notice: By signing, you authenticate access to your single Petros autonomous project.`;

    let recoveredAddress: string;
    try {
      recoveredAddress = verifyMessage(expectedMessage, signature);
    } catch (err: any) {
      throw new Error(`Cryptographic signature verification failed: ${err?.message || err}`);
    }

    if (recoveredAddress.toLowerCase() !== cleanAddress.toLowerCase()) {
      throw new Error(`Signature mismatch: recovered address ${recoveredAddress} does not match claimed ${cleanAddress}`);
    }

    // Challenge verified — consume nonce to prevent replay attacks
    this.pendingNonces.delete(key);

    // Create or retrieve session
    const sessionId = 'petros_sess_' + crypto.randomBytes(24).toString('hex');
    const projectSlug = `project_${cleanAddress.toLowerCase().slice(0, 10)}`;

    const session: WalletSession = {
      sessionId,
      walletAddress: cleanAddress,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_TTL_MS,
      projectSlug,
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Validates an active session token.
   */
  public validateSession(sessionId: string): WalletSession | null {
    if (!sessionId) return null;
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(sessionId);
      return null;
    }
    return session;
  }

  /**
   * Invalidates a session (logout).
   */
  public revokeSession(sessionId: string): boolean {
    return this.activeSessions.delete(sessionId);
  }
}

export const walletAuth = WalletAuthService.getInstance();
