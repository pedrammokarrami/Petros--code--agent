# Petros Autonomous Engineering & Operations AI — Release v4.0.0

## Official Multi-Platform Distribution

Petros v4.0.0 is the official production-ready release candidate delivering native Windows installation, portable zero-install execution, authentic vector documentation, and verified local AI operation.

### Release Assets Included

- **`Petros-Setup.exe` (25.74 MB)**: Official Inno Setup installer for Windows 10 & 11 (64-bit). Bundles Node.js v24.22.1 runtime, desktop shortcuts, and standard uninstaller.
- **`Petros-Portable.zip` (36.56 MB)**: Standalone zero-install portable edition. Extract anywhere and launch `Petros.exe`.
- **`Installation-Guide.pdf` (131 KB)**: Comprehensive setup and architecture walkthrough manual.
- **`User-Guide.pdf` (104 KB)**: Complete end-user manual covering Laya AI, Agent Squad, Wallet security, and App Factory.
- **`SHA256SUMS.txt`**: Cryptographic integrity verification manifest.
- **`release-manifest.json`**: Machine-readable platform compatibility and build metadata.

---

### Key Capabilities

1. **Native Windows Desktop Runner (`Petros.exe`):**
   - High-performance 64-bit C# GUI launcher (`/target:winexe`).
   - Starts local backend services in hidden mode without flashing console windows.
   - Launches an isolated, hardware-accelerated Microsoft Edge App Mode desktop window.
   - Clean shutdown: terminates child processes cleanly on exit with zero orphan processes.
2. **Local AI & Zero API Spend ($0.00):**
   - Probes and connects to Ollama on port 11434 (`qwen3:1.7b`).
   - Laya AI dual-engine Persian (فارسی) and English conversation with context retention.
3. **App Factory & Multi-Agent Squad:**
   - Visual full-stack application synthesis with in-memory TSX transpilation.
   - 1-click project export to `%USERPROFILE%\Desktop\petros`.
4. **Data Isolation & Cryptographic Security:**
   - Web3 BIP-39 wallet identity and EIP-191 authentication challenge-response.
   - AES-256-GCM local secret encryption.
   - User data in `%APPDATA%\Petros` is 100% preserved across upgrades and uninstalls.

---

### SHA-256 Checksums

```text
E0B75EEE2113B208F8D0413429EED162E4EF98EE6BEA49A5CBF8DA11979250E3  Petros-Setup.exe
AE52A91DB5F6A425C5250A263AAA7EED6BE30689FEA68211D22453F3F516E9FA  Petros-Portable.zip
33A49678112404AEDF41356A44D3DADBD06A0667B285A666BDCD340C0164BC96  Installation-Guide.pdf
2A5AD0EF3B4D2CE91C7CCC2B0780451E3E856DD355B4FD55517361F23DE4B296  User-Guide.pdf
```
