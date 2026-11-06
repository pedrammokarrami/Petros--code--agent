# PETROS — FINAL UI/UX SPECIFICATION
## MINIMALIST, HIGH-AESTHETIC CONVERSATIONAL OPERATING SYSTEM

**Date:** November 6, 2026  
**Design Philosophy:** "Form Follows Function" — One Sovereign Chat Surface  
**Target Viewports:** Mobile (iPhone, Android), Tablet, Laptop (MacBook), Desktop (Windows/Linux)

---

## 1. Core Visual Design System

### 1.1 Color Tokens
- **Background Void:** `#02040A` (Deepest obsidian dark, 0% OLED glare).
- **Surface Elevation:** `#0B1220` with `backdrop-filter: blur(20px)` and subtle `1px solid rgba(79, 184, 255, 0.12)` border.
- **Brand Accent Primary:** `#1F6FEB` (Petros Cobalt Blue) with gradient to `#4FB8FF` (Electric Azure).
- **Secondary Accents:**
  - Signal Amber (`#FFB454`): Active background compilation and pending human approval requests.
  - Emerald Green (`#34D399`): Online system vitals, verified cryptographic signatures, and active credit.
  - Rose Danger (`#F43F5E`): Blocked actions, unauthenticated access, or syntax errors.
- **Typography:**
  - Sans: `-apple-system, BlinkMacSystemFont, "Inter", "Vazirmatn", "Segoe UI", sans-serif`.
  - Mono: `"JetBrains Mono", "SF Mono", "Fira Code", monospace` (for wallet addresses, hashes, and credit counters).

---

## 2. Interface Hierarchy & Screen Breakdown

### Screen 1: Sovereign Wallet Gateway (Unauthenticated)
- **Viewport Behavior:** Centered viewport card (`max-w-md`), completely responsive.
- **Components:**
  1. *Brand Shield Icon:* Glossy 3D badge with azure radial lift.
  2. *Primary Action A:* `Create New Wallet` — high-contrast gradient button with 1-click generation.
     - Expands into a 3×4 grid showing the 12-word mnemonic phrase.
     - Clean "Copy" button with visual feedback.
     - Guard checkbox preventing accidental continuation without backup.
  3. *Primary Action B:* `Add Existing Wallet` — secondary outlined button.
     - Detects `window.ethereum` (MetaMask / Brave / Coinbase Wallet) with 1-click personal_sign.
     - Fallback textarea for direct mnemonic or private key verification.
  4. *Zero Technical Noise:* No blockchain network selectors, gas fee prompts, or confusing RPC inputs.

### Screen 2: Laya Sovereign Chat (Authenticated)
- **Viewport Behavior:** Full-screen immersive conversation with ambient point-cloud scan canvas.
- **Top Bar (Invariant Header):**
  - Left: Petros Icon (`P`) + Active Project Name (`Project: Logistics AI Platform`).
  - Center: Truncated Wallet Badge (`0x83...71EA`) with green status dot.
  - Right: Credit Allowance indicator (`8h left today`), Language Switcher (فارسی / EN), and Disconnect Button.
- **Main Chat Stream:**
  - Single thread containing natural conversation, structured startup blueprints, and value propositions.
  - Inline interactive cards for App Factory previews and squad approval gates.
  - Auto-scrolling, touch-friendly on iOS/Android, keyboard-optimized (`Enter` to send, `Shift+Enter` for newline).
- **Bottom Composer:**
  - Pill-shaped minimalist text input with microphone voice input, prompt suggestions, and send button.

---

## 3. Responsive Breakpoint Rules

| Device Class | Viewport Range | Layout Adjustments |
| :--- | :--- | :--- |
| **Mobile (iPhone/Android)** | 375px – 480px | Stacked header pills, truncated project text, floating bottom composer with mobile safe area padding (`pb-safe`). Full-width buttons. |
| **Tablet** | 768px – 1024px | Centered 640px chat container, side margins, compact telemetry pills. |
| **MacBook / Laptop** | 1280px – 1440px | Standard 760px chat container, visible room navigation bar in secondary view. |
| **Desktop Ultra-Wide** | 1920px+ | Max-width 880px conversational column with ambient lateral point-cloud particle density. |

---

## 4. Accessibility & Multi-Language Support

- **Bilingual Bidirectionality:**
  - Persian (`fa`): Automatically sets `dir="rtl"`, applies `Vazirmatn` font metrics, right-aligns input, and mirrors icons.
  - English (`en`): Sets `dir="ltr"`, standard left alignment.
- **Focus & Touch Targets:** All buttons meet WCAG 2.1 AA standards (minimum 44×44px touch targets).
