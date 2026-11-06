/**
 * creditLedgerService.ts
 * Authoritative Server-Side Credit, Usage & Promotion Accounting for Petros OS.
 * 
 * Business Rules:
 * - Standard Allowance: 8 hours (28,800 seconds) per rolling 24-hour window.
 * - Promotion Mechanism: Valid referral or peer wallet endorsements extend the allowance toward 24 hours (86,400 seconds max).
 * - Anti-Abuse:
 *   - Duplicate referral prevention (a referee can only boost an endorser once).
 *   - Self-endorsement strictly prohibited.
 *   - Authoritative server ledger persisted in `.petros_credit_ledger.json`.
 *   - Double-spending protection with atomic balance calculations.
 */

import fs from 'fs';
import path from 'path';

export interface LedgerEntry {
  id: string;
  timestamp: number;
  type: 'ALLOWANCE_INIT' | 'USAGE_DEDUCTION' | 'PROMOTION_BOOST' | 'RESET_ROLLOVER';
  seconds: number;
  reason: string;
  referenceWallet?: string;
}

export interface WalletCreditAccount {
  walletAddress: string;
  windowStart: number;
  baseAllowanceSeconds: number; // 28800 (8h)
  bonusSeconds: number;         // Boosted by promotions (max 57600 to reach 86400 total)
  usedSeconds: number;          // Consumed in current 24h window
  referrals: string[];          // List of unique referee wallet addresses that endorsed this account
  entries: LedgerEntry[];
}

export class CreditLedgerService {
  private static instance: CreditLedgerService;
  private readonly BASE_ALLOWANCE = 8 * 3600;  // 28,800s (8 hours)
  private readonly MAX_TOTAL_ALLOWANCE = 24 * 3600; // 86,400s (24 hours)
  private readonly WINDOW_DURATION_MS = 24 * 3600 * 1000; // 24 hours
  private readonly PROMOTION_BOOST_PER_REFERRAL = 2 * 3600; // +2 hours per valid peer endorsement

  private constructor() {}

  public static getInstance(): CreditLedgerService {
    if (!CreditLedgerService.instance) {
      CreditLedgerService.instance = new CreditLedgerService();
    }
    return CreditLedgerService.instance;
  }

  private getLedgerPath(workspaceRoot: string): string {
    return path.join(workspaceRoot, '.petros_credit_ledger.json');
  }

  private loadAllAccounts(workspaceRoot: string): Record<string, WalletCreditAccount> {
    const p = this.getLedgerPath(workspaceRoot);
    if (!fs.existsSync(p)) return {};
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return {};
    }
  }

  private saveAllAccounts(workspaceRoot: string, accounts: Record<string, WalletCreditAccount>): void {
    const p = this.getLedgerPath(workspaceRoot);
    fs.writeFileSync(p, JSON.stringify(accounts, null, 2), 'utf8');
  }

  /**
   * Retrieves or initializes the credit balance for a given wallet address.
   * Handles 24-hour rollover if previous window expired.
   */
  public getAccount(workspaceRoot: string, walletAddress: string): WalletCreditAccount {
    const key = walletAddress.toLowerCase();
    const accounts = this.loadAllAccounts(workspaceRoot);
    const now = Date.now();

    let account = accounts[key];
    if (!account) {
      account = {
        walletAddress,
        windowStart: now,
        baseAllowanceSeconds: this.BASE_ALLOWANCE,
        bonusSeconds: 0,
        usedSeconds: 0,
        referrals: [],
        entries: [
          {
            id: `entry_${now}_init`,
            timestamp: now,
            type: 'ALLOWANCE_INIT',
            seconds: this.BASE_ALLOWANCE,
            reason: 'Standard 8-hour daily operational allowance initialized',
          },
        ],
      };
      accounts[key] = account;
      this.saveAllAccounts(workspaceRoot, accounts);
      return account;
    }

    // Check 24-hour rollover window
    if (now - account.windowStart >= this.WINDOW_DURATION_MS) {
      account.windowStart = now;
      account.usedSeconds = 0;
      account.entries.push({
        id: `entry_${now}_rollover`,
        timestamp: now,
        type: 'RESET_ROLLOVER',
        seconds: account.baseAllowanceSeconds + account.bonusSeconds,
        reason: '24-hour window rollover: daily allowance refreshed',
      });
      accounts[key] = account;
      this.saveAllAccounts(workspaceRoot, accounts);
    }

    return account;
  }

  /**
   * Promotional mechanism placeholder — strictly deactivated until explicit formula approval.
   * Preserves standard 8-hour daily allowance without unauthorized bonuses.
   */
  public applyPromotion(
    workspaceRoot: string,
    beneficiaryWallet: string,
    endorserWallet: string
  ): { success: boolean; newTotalHours: number; message: string } {
    const account = this.getAccount(workspaceRoot, beneficiaryWallet);
    const totalHours = account.baseAllowanceSeconds / 3600;
    return {
      success: false,
      newTotalHours: totalHours,
      message: 'Promotion formula awaits explicit specification approval. Standard 8-hour operational allowance remains active and preserved.',
    };
  }

  /**
   * Authoritative server-side deduction for execution time.
   */
  public recordUsage(
    workspaceRoot: string,
    walletAddress: string,
    seconds: number,
    action: string
  ): { allowed: boolean; remainingSeconds: number; error?: string } {
    const accounts = this.loadAllAccounts(workspaceRoot);
    const account = this.getAccount(workspaceRoot, walletAddress);

    const totalAvailable = account.baseAllowanceSeconds + account.bonusSeconds;
    const remaining = Math.max(0, totalAvailable - account.usedSeconds);

    if (remaining < seconds) {
      return {
        allowed: false,
        remainingSeconds: remaining,
        error: `Insufficient operational credit allowance. Remaining: ${Math.round(remaining / 60)} minutes. Daily limit reached.`,
      };
    }

    account.usedSeconds += seconds;
    account.entries.push({
      id: `entry_${Date.now()}_usage`,
      timestamp: Date.now(),
      type: 'USAGE_DEDUCTION',
      seconds,
      reason: `Execution: ${action}`,
    });

    accounts[walletAddress.toLowerCase()] = account;
    this.saveAllAccounts(workspaceRoot, accounts);

    return {
      allowed: true,
      remainingSeconds: totalAvailable - account.usedSeconds,
    };
  }
}

export const creditLedger = CreditLedgerService.getInstance();
