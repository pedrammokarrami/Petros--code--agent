# PETROS — CREDIT & PROMOTION ECONOMY SPECIFICATION
## AUDITABLE USAGE LEDGER & MULTI-USER PROMOTIONAL MECHANISM

**Date:** November 6, 2026  
**Implementation:** `server/services/creditLedgerService.ts`  
**Persistence Store:** `.petros_credit_ledger.json`

---

## 1. Credit Economics Architecture

### 1.1 Baseline Allowance
- **Standard Allowance:** 8 operational hours (28,800 seconds) per user wallet.
- **Window:** 24-hour rolling window (`WINDOW_DURATION_MS = 86,400,000 ms`).
- **Rollover Rule:** When `Date.now() - windowStart >= 24h`, the backend resets `usedSeconds = 0`, logs a `RESET_ROLLOVER` ledger transaction, and updates `windowStart = Date.now()`.
- **Authoritative Source:** The backend server is the **sole authoritative calculator** of time and credit. Client-side timers, submitted balances, or forged headers are completely ignored.

### 1.2 Promotional Multi-User Expansion
- **Mechanism:** A wallet user can invite peer wallets to endorse their account.
- **Endorsement Value:** Each unique peer wallet endorsement grants **+2 hours (7,200 seconds)** of additional operational credit.
- **Ceiling:** Promotional endorsements can expand the standard 8-hour allowance up to a hard ceiling of **24 hours (86,400 seconds)**.
- **Formula:**
  $$\text{Total Allowance} = \min\left(24\text{ hours}, \text{Base Allowance } (8\text{h}) + \sum_{i=1}^{k} \text{Endorsement}_i\right)$$

---

## 2. Anti-Abuse & Integrity Controls

1. **Self-Endorsement Prohibition:**
   - Attempting to endorse one's own wallet (`beneficiary === endorser`) is strictly rejected with:
     `"Self-referral is strictly prohibited."`
2. **Duplicate Endorsement Prevention:**
   - The ledger maintains an array of unique referee addresses (`referrals: string[]`).
   - If an endorser address has already boosted the beneficiary, subsequent attempts are rejected with:
     `"This peer wallet has already endorsed your account."`
3. **Double-Spending Prevention:**
   - Usage deductions (`recordUsage`) check remaining credit before approving background worker or model execution.
   - If remaining credit is less than the requested execution time, the operation is blocked:
     `"Insufficient operational credit allowance. Daily limit reached."`
4. **Auditable Transaction Ledger:**
   - Every credit event (`ALLOWANCE_INIT`, `PROMOTION_BOOST`, `USAGE_DEDUCTION`, `RESET_ROLLOVER`) is permanently recorded with a timestamp, unique ID, delta seconds, and reference wallet.

---

## 3. JSON Ledger Schema Sample

```json
{
  "0x83fb5e0eabbf0b410bd18743e1a612b894c671ea": {
    "walletAddress": "0x83Fb5e0eaBbf0B410BD18743E1A612B894C671EA",
    "windowStart": 1793989812600,
    "baseAllowanceSeconds": 28800,
    "bonusSeconds": 7200,
    "usedSeconds": 0,
    "referrals": [
      "0xd4f63a2981bc9e99a89b71f92e028b18a38c201a"
    ],
    "entries": [
      {
        "id": "entry_1793989812600_init",
        "timestamp": 1793989812600,
        "type": "ALLOWANCE_INIT",
        "seconds": 28800,
        "reason": "Standard 8-hour daily operational allowance initialized"
      },
      {
        "id": "entry_1793989812650_promo",
        "timestamp": 1793989812650,
        "type": "PROMOTION_BOOST",
        "seconds": 7200,
        "reason": "Promotion boost from peer endorsement (0xd4f63a...)",
        "referenceWallet": "0xd4f63a2981bc9e99a89b71f92e028b18a38c201a"
      }
    ]
  }
}
```

---

## 4. Verified API Endpoints

- `GET /api/credit/balance`: Returns daily allowance, used time, remaining time, and transaction history.
- `POST /api/credit/promote`: Accepts `{ endorserWallet }` with valid session token and applies promotion boost.
