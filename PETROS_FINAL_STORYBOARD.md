# PETROS — FINAL PRODUCT STORYBOARD
## THE AUTONOMOUS STARTUP OPERATING SYSTEM

**Date:** November 6, 2026  
**Product Version:** 4.0.0 (Production Release)  
**Architecture:** Single Unified Sovereign Interface

---

## Executive Vision: One Unified AI-Powered Product

Petros is not a developer tool, a multi-dashboard dashboard, or an agent marketplace. It is **The Autonomous Startup Operating System** presented to founders, entrepreneurs, and builders as **ONE unified, cohesive experience**:

```
+-------------------------------------------------------------------------+
|                               PETROS                                    |
|                                                                         |
|   [ SCENE 1: WALLET ENTRY ]                                             |
|        │                                                                |
|        ├── A. Create New Sovereign Wallet (12-word recovery phrase)     |
|        └── B. Add Existing Wallet (Cryptographic signature challenge)   |
|                                                                         |
|                               ▼                                         |
|   [ SCENE 2: DIRECT ENTRY INTO LAYA ]                                   |
|        │                                                                |
|        ├── No Dashboard                                                 |
|        ├── No Project Picker (1 User = 1 Active Project)                |
|        └── No Technical Menus                                           |
|                                                                         |
|                               ▼                                         |
|   [ SCENE 3: LAYA AS THE ONLY USER-FACING AI ]                          |
|        │                                                                |
|        ├── Natural Conversational Interface (Persian & English)         |
|        ├── Conversational Budgeting & Key Management                    |
|        └── Central Orchestration Companion                              |
|                                                                         |
|                               ▼                                         |
|   [ SCENE 4: HIDDEN BACKGROUND OPERATIONS ]                             |
|        ├── App Factory & ESBuild Auto-Repair (In-memory TSX compilation)|
|        ├── Agent Squads (Strategist ➔ Architect ➔ Engineer ➔ Growth)     |
|        ├── Local LLM Inference (Ollama Qwen3 1.7b @ 127.0.0.1:11434)   |
|        ├── Headless Chrome Playwright Automation                        |
|        └── Guarded Windows Worker & MCP Bridge (confirm: "RUN" gate)    |
+-------------------------------------------------------------------------+
```

---

## Detailed Storyboard Scenes

### SCENE 1 — WALLET AUTHENTICATION
The first and only non-chat screen encountered by an unauthenticated user. It presents a minimal, high-aesthetic glassmorphism surface with exactly two primary paths:

#### Option A: CREATE NEW WALLET
1. **Client-Side Key Generation**: Uses `ethers.Wallet.createRandom()`.
2. **Sovereign Identity**: Derives an Ethereum/EVM address and a standard BIP-39 12-word mnemonic phrase.
3. **Safety Protection**:
   - The user is displayed their 12-word recovery phrase in an interactive grid.
   - Includes 1-click clipboard copy.
   - Requires explicit checkbox confirmation: *"I have securely written down my recovery phrase"*.
   - **Zero Knowledge**: Private keys and mnemonic seed phrases are **never sent to or stored on the Petros backend**.
4. **Signature Handshake**:
   - Client requests challenge nonce from `POST /api/auth/challenge`.
   - Client cryptographically signs the challenge message:
     ```
     Sign in to Petros OS
     Wallet: 0x...
     Nonce: <32-hex-nonce>
     Issued At: 2026-11-06T...
     Notice: By signing, you authenticate access to your single Petros autonomous project.
     ```
   - Client sends signature to `POST /api/auth/verify`.
   - Backend recovers address using `ethers.verifyMessage()`.
   - On match, server issues `petros_sess_<token>` and initializes single project context.

#### Option B: ADD EXISTING WALLET
1. **Multiple Input Methods**:
   - Direct connection via Browser Web3 Wallet (`window.ethereum` / MetaMask) with 1-click personal_sign.
   - Direct recovery phrase or private key import executed strictly client-side.
2. **Cryptographic Proof of Ownership**:
   - A public address alone is strictly rejected as proof of ownership.
   - Server requires cryptographic signature verification against a dynamic 5-minute single-use nonce.
3. **Replay & Forgery Protection**:
   - Challenge nonces are consumed immediately upon successful verification.
   - Replay attempts immediately return HTTP 401 Unauthorized.
   - Signatures forged by a different private key return HTTP 401 Unauthorized.
4. **Project Recovery**:
   - The backend maps the recovered wallet address to the user's persistent project profile, `.petros_memory.json`, credit ledger, and conversation history.

---

### SCENE 2 — DIRECT ENTRY INTO LAYA
Immediately following cryptographic signature verification:
- **Zero Interstitial Clutter**: The system bypasses all dashboards, project selectors, and agent cards.
- **One Active Project**: Every authenticated wallet possesses exactly one primary active project.
  - New users initialize their venture conversationally through Laya.
  - Returning users seamlessly recover their ongoing venture, architecture decisions, and roadmap.
- **Header Telemetry**:
  - Petros Sovereign Mark.
  - Active Project Label (e.g. *Project: Logistics AI Platform*).
  - Truncated Wallet Pill (`0x83Fb...71EA`).
  - Authoritative Daily Allowance (`8h left today` with promotion boost indicators).
  - Language Switcher (فارسی / EN).
  - 1-Click Disconnect / Logout button.

---

### SCENE 3 — LAYA AS THE ONLY USER-FACING AI
Laya is the singular voice, mind, and companion of Petros. All user interaction is conversational:
1. **Bilingual Fluency**: Speaks natural, culturally nuanced Persian and English.
2. **Startup Formulation**: Translates raw ideas into structured value propositions, target market analyses, revenue models, and MVP roadmaps.
3. **Conversational Budgeting**:
   - Laya explores budget conversationally inside the chat.
   - **Zero Budget**: Laya activates verified local Ollama inference (`qwen3:1.7b`) and local free routers ($0.00 cost).
   - **Additional Budget**: Laya explains credits or allows the user to securely store their own API key (stored with AES-256-GCM encryption).
   - No external paid API call is ever made without explicit conversational consent.
4. **Human Approval Gateway**:
   - When code execution or system modification is proposed, Laya requests explicit user authorization (`confirm: "RUN"`).
   - Guarded actions remain locked until approved.

---

### SCENE 4 — HIDDEN BACKGROUND OPERATIONS
All engineering complexity runs beneath Laya's conversational interface:
1. **App Factory**: When a frontend MVP is generated, ESBuild compiles TSX in-memory in <30ms, auto-repairs unclosed JSX tags, and exports a standalone Vite project.
2. **Multi-Agent Squads**: Strategist, Architect, Guarded Engineer, and Growth agents collaborate in the background, surfacing high-level milestones to Laya.
3. **Local Computer Use**: Playwright headless Chrome executes real web search and DOM scraping invisibly on the host machine.
4. **Windows Worker & MCP**: The supervisor bridge interacts with local developer tools via standard JSON-RPC loopback (`127.0.0.1:19847 / 19848`).
