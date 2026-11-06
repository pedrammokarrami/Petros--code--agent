# PETROS — BACKEND ARCHITECTURE SPECIFICATION
## UNIFIED AUTONOMOUS CORE & MICRO-SERVICES TOPOLOGY

**Date:** November 6, 2026  
**Status:** Validated Production Architecture  
**Port Hierarchy:** All internal services strictly bound to loopback `127.0.0.1`

---

## 1. System Topology & Process Map

```
                     +---------------------------------------+
                     |         CLIENT / BROWSER UI           |
                     |   (Single Laya Chat + Wallet Entry)   |
                     +---------------------------------------+
                                         │
                                         ▼ HTTP / WebSocket
+─────────────────────────────────────────────────────────────────────────────────────────+
| PETROS UNIFIED BACKEND SERVER (Node.js Express / TSX Daemon @ 127.0.0.1:3000)           |
|                                                                                         |
|  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────────────────┐ |
|  │  WalletAuthService  │  │ CreditLedgerService │  │      SecretManagerService        │ |
|  │ (Ethers SIWE / EIP) │  │  (8h/24h Allowance) │  │       (AES-256-GCM / PBKDF2)     │ |
|  └─────────────────────┘  └─────────────────────┘  └──────────────────────────────────┘ |
|                                                                                         |
|  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────────────────┐ |
|  │ ProjectMemoryService│  │  AppFactoryService  │  │     SquadOrchestratorService     │ |
|  │  (Mem0 JSON Store)  │  │  (ESBuild Sandbox)  │  │      (CrewAI 4-Stage Pipeline)   │ |
|  └─────────────────────┘  └─────────────────────┘  └──────────────────────────────────┘ |
|                                                                                         |
|  ┌──────────────────────────────────────────────┐  ┌──────────────────────────────────┐ |
|  │       PlaywrightBrowserService (Python)      │  │        Key & PIN Security        │ |
|  │       (Google Chrome Headless v1.64.1)       │  │        (Anti-Trivial Pin Gate)   │ |
|  └──────────────────────────────────────────────┘  └──────────────────────────────────┘ |
+─────────────────────────────────────────────────────────────────────────────────────────+
         │                                                        │
         ▼ HTTP JSON-RPC                                          ▼ OpenAI-Compatible REST
+──────────────────────────────+                         +──────────────────────────────+
| PETROS SUPERVISOR & ROUTER   |                         | LAYA INTELLIGENT GATEWAY     |
| • Router: 127.0.0.1:19847    |                         | Port: 127.0.0.1:20131        |
| • MCP Bridge: 127.0.0.1:19848|                         | • Local Ollama (11434)       |
| • Windows Code Engineer      |                         | • OpenMausBot (8798)         |
| Guard: confirm === "RUN"     |                         | • Free Cascade (Pollinations)|
+──────────────────────────────+                         +──────────────────────────────+
```

---

## 2. Component Specifications

### 2.1 Wallet Authentication & Session Management
- **Module:** `server/services/walletAuthService.ts`
- **Standard:** EIP-191 personal_sign + EIP-4361 challenge format.
- **Session Lifecyle:**
  - Nonces expire in 5 minutes.
  - Sessions issued with 7-day TTL: `petros_sess_<hex>`.
  - Stored in memory and validated on protected endpoints (`/api/auth/me`, `/api/credit/promote`, `/api/secrets/*`).
- **Isolation Guarantee:** Each wallet is assigned a unique `projectSlug` (e.g. `project_0x83fb5e...`). A user's wallet can never query or modify another user's project memory or secrets.

### 2.2 Authoritative Credit Ledger & Anti-Abuse System
- **Module:** `server/services/creditLedgerService.ts`
- **Store:** `WORKSPACE_ROOT/.petros_credit_ledger.json`
- **Allowances:**
  - Standard Base: 8 hours (28,800 seconds) per rolling 24-hour window.
  - Rollover: Resets automatically every 24 hours.
  - Promotional Bonus: Peer endorsements add +2 hours (up to a hard cap of 24 hours total = 86,400 seconds).
- **Anti-Abuse Controls:**
  - `self-referral` check: `beneficiaryWallet !== endorserWallet`.
  - Duplicate check: each peer wallet can only endorse an account once.
  - Atomic server ledger prevents double-spending.

### 2.3 Secret Management & Key Vault
- **Module:** `server/services/secretManagerService.ts`
- **Store:** `WORKSPACE_ROOT/.petros_secrets.enc.json`
- **Encryption:** AES-256-GCM with unique 12-byte initialization vectors and 16-byte authentication tags.
- **Key Derivation:** PBKDF2 with 100,000 SHA-256 iterations.
- **Privacy:** Plaintext keys are never returned in HTTP responses or written to logs; client queries receive masked strings (e.g. `sk-ant...3456`).

### 2.4 App Factory & AST Auto-Repair
- **Module:** `server/services/appFactoryService.ts`
- **Compilation Engine:** ESBuild in-memory transform (<30ms latency).
- **Auto-Repair:** Heuristically closes unbalanced JSX tags (`div`, `section`, `main`, `p`, `span`, `h1-h3`) and strips illegal semicolons inside JSX tags.
- **Standalone Project Exporter:** Generates complete Vite runnable apps in `apps/generated/<appId>/` with `package.json`, `index.html`, `vite.config.ts`, `src/App.tsx`, and `src/main.tsx`.

### 2.5 Multi-Agent Squad Orchestrator
- **Module:** `server/services/squadOrchestratorService.ts`
- **Pipeline:**
  1. *Strategist Stage:* Synthesizes value propositions, target audiences, and revenue economics.
  2. *Architect Stage:* Generates schema contracts and component hierarchies.
  3. *Engineering Stage (Guarded):* Halts execution, generates an approval token, and waits for user authorization (`confirm === "RUN"`).
  4. *Growth Stage:* Produces launch strategies and client acquisition loops.
