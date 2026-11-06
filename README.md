# Petros (پتروس) — Autonomous AI Operating System for Startups

> **Sovereign, Zero-Cost, Autonomous AI Operating System for Persian-Speaking and Global Startup Founders.**
> 
> $\text{WALLET} \longrightarrow \text{LAYA} \longrightarrow \text{ONE PROJECT} \longrightarrow \text{EVERYTHING IN CHAT}$

---

## 🌟 Key Features

- **🔐 Sovereign Web3 Authentication**: Zero passwords, zero emails. Client-side BIP-39 mnemonic phrase and EIP-191 ECDSA challenge signatures. Private keys never leave the browser.
- **💬 Laya Conversational Launchpad**: Autonomous AI companion fluent in Persian and English. Transforms raw business concepts into market blueprints, unit economics models, and technical architectures.
- **🧠 Episodic Startup Memory**: Persistent project memory (`.petros_memory.json`) retaining architecture choices, business goals, and strategic decisions across reloads.
- **🤖 Autonomous Agent Squads (CrewAI Pattern)**: Multi-agent sequential pipeline:
  - *Startup Strategist* $\rightarrow$ *Software Architect* $\rightarrow$ **Human Approval Gate** $\rightarrow$ *Guarded Code Engineer* $\rightarrow$ *Growth Lead*.
- **🏭 App Factory Sandbox**: Instant React TSX validation (43ms via `esbuild`) and complete standalone Vite project export.
- **🌐 Computer Use Browser Engine**: Web research, competitor intelligence, and DOM extraction powered by Microsoft Playwright.
- **🔒 AES-256-GCM Cryptographic Vault**: Enterprise-grade API key protection with PBKDF2 key derivation (100k iterations) and masked client hints.
- **⏱️ Hardened Operational Credit Ledger**: 8 hours daily operational fuel per wallet with persistent tracking.
- **⚡ Zero External API Costs**: 100% powered by local Ollama (`qwen3:1.7b`) with $0.00 external spend.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ or v24+
- [Ollama](https://ollama.ai/) with `qwen3:1.7b` (`ollama run qwen3:1.7b`)
- Google Chrome (for automated browser capabilities)

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pedrammokarrami/Petros--code--agent.git
   cd Petros--code--agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the production bundle**:
   ```bash
   npm run build
   ```

4. **Launch the Petros OS Server**:
   ```bash
   node dist/server.cjs
   ```
   *(Server listens on `http://127.0.0.1:3000` and Laya Gateway on `http://127.0.0.1:20131`)*

5. **Open in Browser**:
   Navigate to [http://127.0.0.1:3000](http://127.0.0.1:3000). Click **Create New Wallet**, save your recovery mnemonic, and enter Laya directly.

---

## 🧪 Testing & Verification

Petros includes comprehensive automated test suites:

```bash
# Typecheck validation
npm run lint

# Exhaustive 0-to-100 UI/UX, security, and API acceptance
npm run test:acceptance

# Cryptographic wallet security, replay protection & AES vault
node scripts/test_wallet_credit_security.mjs

# Open-source framework integration tests
node scripts/test_opensource_integrations.mjs

# Human-in-the-Loop gate security test
node scripts/test_squad_human_gate.mjs

# App Factory TSX validation & export test
node scripts/test_app_factory_export.mjs

# 5 Persian real-customer business scenarios
node scripts/test_laya_scenarios.mjs

# Playwright automated Chrome QA
python scripts/run_autonomous_full_qa.py
```

---

## 🛡️ Security & Privacy

- **Zero Plaintext Secrets**: API keys stored via authenticated AES-256-GCM symmetric cipher.
- **Replay Protection**: Challenge nonces expire in 300 seconds and are single-use.
- **Strict Isolation**: Every wallet maps deterministically to a private, isolated workspace slug (`project_<address>`).
- **Human Approval Gate**: Destructive code changes or deployments strictly require explicit human token authorization.

---

## 📄 License

MIT License. Built on proven open-source technologies including `ethers.js`, `esbuild`, `playwright`, `crewai`, and `mem0`.
