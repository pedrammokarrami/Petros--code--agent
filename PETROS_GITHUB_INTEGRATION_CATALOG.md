# PETROS — GITHUB OPEN-SOURCE INTEGRATION CATALOG
## PRODUCTION REPOSITORIES, SDKs & VERIFIED MODULES

**Date:** November 6, 2026  
**Integration Policy:** ZERO Original Coding — 100% Proven Open-Source Reuse  
**Compliance Standard:** Permissive Open-Source (MIT, Apache-2.0, BSD-3-Clause)

---

## Catalog of Verified Integrations

### 1. Cryptographic Wallet Authentication & SIWE
- **Original Repository:** [`ethers-io/ethers.js`](https://github.com/ethers-io/ethers.js)
- **License:** MIT License
- **Version:** `v6.13.5`
- **Source Paths Reused:**
  - `ethers/wallet`: `Wallet.createRandom()` client-side BIP-39 mnemonic phrase and private key generation.
  - `ethers/crypto`: `verifyMessage(message, signature)` EIP-191 personal_sign cryptographic address recovery.
  - `ethers/address`: `getAddress(address)` EIP-55 checksum validation.
- **Petros Integration Location:**
  - Backend: `server/services/walletAuthService.ts`
  - Frontend: `src/components/WalletAuthScreen.tsx`
- **Tests Performed:**
  - `scripts/test_wallet_credit_security.mjs` (11/11 tests passed).
  - Cryptographic signature challenge-response, replay attack prevention, forgery rejection, session revocation.

---

### 2. Fast In-Memory Transpilation & Sandbox
- **Original Repository:** [`evanw/esbuild`](https://github.com/evanw/esbuild)
- **License:** MIT License
- **Version:** `v0.28.2`
- **Source Paths Reused:**
  - `esbuild.transform(code, { loader: 'tsx', jsx: 'transform' })`: Sub-30ms in-memory compilation of React TSX into executable JavaScript.
  - AST Syntax Error Detection: Line-level parsing of syntax defects for automated heuristic repair.
- **Petros Integration Location:**
  - Backend: `server/services/appFactoryService.ts`
  - Frontend: `src/components/petros-city/ContentStudioRoom.tsx`
- **Tests Performed:**
  - `scripts/test_opensource_integrations.mjs` (Step 8, 9, 10).
  - `scripts/test_app_factory_export.mjs` (Standalone bundle compilation in 44ms).

---

### 3. Local Headless Browser Automation (Computer Use)
- **Original Repository:** [`microsoft/playwright`](https://github.com/microsoft/playwright)
- **License:** Apache-2.0 License
- **Version:** `v1.64.1` (Python Playwright Engine)
- **Source Paths Reused:**
  - `playwright.sync_api.sync_playwright()`: Local driver connecting to system Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`).
  - Headless DOM extraction, screenshot generation, web navigation, and automated QA.
- **Petros Integration Location:**
  - Engine: `scripts/playwright_runner.py`
  - Service: `server/services/playwrightBrowserService.ts`
  - QA Suites: `scripts/human_qa_playwright.py`, `scripts/human_qa_release_gate.py`, `scripts/test_storyboard_e2e.py`
- **Tests Performed:**
  - Automated Chrome testing across 5 viewports (1920x1080, 1440x900, 768x1024, 412x915, 390x844).
  - 10-step real user workflow execution with screenshot verification.

---

### 4. Multi-Agent Squad Orchestrator (CrewAI Architecture)
- **Original Repository:** [`crewAIInc/crewAI`](https://github.com/crewAIInc/crewAI)
- **License:** MIT License
- **Pattern Reused:** Sequential role-based agent execution pipeline:
  - Role 1: **Startup Strategist** (Idea formulation, value proposition, market TAM/SAM).
  - Role 2: **System Architect** (API schema, technology contracts, database model).
  - Role 3: **Guarded Engineer** (Human-in-the-loop approval gate `confirm: "RUN"` before disk writes).
  - Role 4: **Growth Operator** (Go-to-market strategy, client acquisition loop).
- **Petros Integration Location:**
  - Service: `server/services/squadOrchestratorService.ts`
  - UI: `src/components/petros-city/AgencyRoom.tsx`
- **Tests Performed:**
  - `scripts/test_opensource_integrations.mjs` (Step 5, 6, 7).
  - Mission pause at Engineering Approval Gate and resumption with signed approval token.

---

### 5. Persistent Project Memory (Mem0 / Letta Architecture)
- **Original Repository:** [`mem0ai/mem0`](https://github.com/mem0ai/mem0)
- **License:** Apache-2.0 License
- **Pattern Reused:**
  - Tiered conversational memory hierarchy: Active Startup Context, Recent Architectural Decisions, Milestones, and System Grounding.
  - JSON-backed persistent store (`.petros_memory.json`).
  - Dynamic prompt injection (`formatMemoryContextForPrompt()`) into Laya system context.
- **Petros Integration Location:**
  - Service: `server/services/projectMemoryService.ts`
  - Router Injection: `server.ts` (lines 1420-1440)
- **Tests Performed:**
  - Context retention verified across restarts, multiple conversation turns, and language switches.

---

### 6. Local LLM Runtime (OpenAI-Compatible Gateway)
- **Original Repository:** [`ollama/ollama`](https://github.com/ollama/ollama)
- **License:** MIT License
- **Version:** Ollama Host Process (PIDs 7732 / 8768)
- **API Spec Reused:** Standard OpenAI Chat Completions API (`POST /v1/chat/completions`).
- **Petros Integration Location:**
  - Gateway: `server/layaRouter.ts` (Listening on loopback `127.0.0.1:20131`)
  - Backends: Local Ollama `http://127.0.0.1:11434` as first-class discovered live daemon.
- **Tests Performed:**
  - Real local inference with model `qwen3:1.7b` without internet access ($0.00 cost).

---

### 7. Secret Encryption & Hardware-Bound Credential Store
- **Original Repository:** Node.js Native Crypto Core (OpenSSL 3.0 / FIPS compliant)
- **Standard Reused:** NIST SP 800-38D (AES-256-GCM authenticated encryption).
- **Functionality Reused:**
  - `crypto.createCipheriv('aes-256-gcm', key, iv)` with 12-byte IV and 16-byte auth tag.
  - `crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256')` key derivation.
- **Petros Integration Location:**
  - Service: `server/services/secretManagerService.ts`
  - Storage: `.petros_secrets.enc.json`
- **Tests Performed:**
  - Verified ciphertext on disk, masked client rendering, and zero plaintext leaks.
