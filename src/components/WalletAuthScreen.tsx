import React, { useState } from 'react';
import { Wallet } from 'ethers';
import { Shield, Key, Plus, ArrowRight, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  isFa?: boolean;
  onAuthenticated: (session: { sessionId: string; walletAddress: string; projectSlug: string }) => void;
}

export function WalletAuthScreen({ isFa = false, onAuthenticated }: Props) {
  const [mode, setMode] = useState<'select' | 'create' | 'import'>('select');
  const [createdWallet, setCreatedWallet] = useState<{ address: string; mnemonic: string; privateKey: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A. Create New Wallet (ethers.Wallet.createRandom)
  const handleCreateWallet = () => {
    setIsLoading(true);
    setError(null);
    try {
      const w = Wallet.createRandom();
      if (!w.mnemonic?.phrase) {
        throw new Error('Failed to generate mnemonic phrase');
      }
      setCreatedWallet({
        address: w.address,
        mnemonic: w.mnemonic.phrase,
        privateKey: w.privateKey,
      });
      setMode('create');
    } catch (err: any) {
      setError(err?.message || 'Error generating wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPhrase = () => {
    if (createdWallet?.mnemonic) {
      navigator.clipboard.writeText(createdWallet.mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Sign challenge and complete authentication
  const authenticateWithWallet = async (walletInstance: { address: string; signMessage: (msg: string) => Promise<string> }) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Get challenge nonce
      const chRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletInstance.address }),
      });
      const chData = await chRes.json();
      if (!chRes.ok || !chData.success) {
        throw new Error(chData.error || 'Failed to fetch challenge nonce');
      }

      // 2. Cryptographically sign message client-side
      const signature = await walletInstance.signMessage(chData.challengeMessage);

      // 3. Verify signature on backend
      const verRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletInstance.address,
          signature,
          message: chData.challengeMessage,
        }),
      });
      const verData = await verRes.json();
      if (!verRes.ok || !verData.success) {
        throw new Error(verData.error || 'Wallet verification failed');
      }

      // 4. Save session and enter Laya
      localStorage.setItem('petros_wallet_session', JSON.stringify(verData.session));
      onAuthenticated(verData.session);
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  // B. Add Existing Wallet (Mnemonic, Private Key, or Browser Provider)
  const handleImportWallet = async () => {
    const raw = importInput.trim();
    if (!raw) {
      setError(isFa ? 'لطفاً عبارت بازیابی یا کلید خصوصی را وارد کنید' : 'Please provide recovery phrase or private key');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let walletInstance: { address: string; signMessage: (msg: string) => Promise<string> };
      if (raw.split(/\s+/).length >= 12) {
        // Mnemonic phrase
        walletInstance = Wallet.fromPhrase(raw);
      } else {
        // Private key
        const pk = raw.startsWith('0x') ? raw : `0x${raw}`;
        walletInstance = new Wallet(pk);
      }

      await authenticateWithWallet(walletInstance);
    } catch (err: any) {
      setError(err?.message || (isFa ? 'عبارت بازیابی یا کلید نامعتبر است' : 'Invalid recovery phrase or private key'));
      setIsLoading(false);
    }
  };

  // Browser Wallet Connection (e.g. MetaMask/EIP-1193)
  const handleConnectBrowserWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError(isFa ? 'افزونه مرورگر (مانند متامسک) شناسایی نشد. لطفاً از گزینه کلید/عبارت استفاده کنید.' : 'No Web3 browser wallet detected. Use recovery phrase or key option.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // 1. Get challenge
      const chRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const chData = await chRes.json();
      if (!chRes.ok || !chData.success) throw new Error(chData.error || 'Failed to get challenge');

      // 2. Request signature via provider
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [chData.challengeMessage, address],
      });

      // 3. Verify on server
      const verRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message: chData.challengeMessage }),
      });
      const verData = await verRes.json();
      if (!verRes.ok || !verData.success) throw new Error(verData.error || 'Verification failed');

      localStorage.setItem('petros_wallet_session', JSON.stringify(verData.session));
      onAuthenticated(verData.session);
    } catch (err: any) {
      setError(err?.message || 'Browser wallet authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#02040A] text-slate-100 flex items-center justify-center p-4 select-none font-sans" dir={isFa ? 'rtl' : 'ltr'}>
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-[#02040A] to-[#02040A] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-950/80 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#0A2E66] via-[#1F6FEB] to-[#4FB8FF] flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            PETROS
          </h1>
          <p className="text-xs text-slate-400">
            {isFa
              ? 'سیستم‌عامل خودکار استارتاپ — احراز هویت با کیف پول'
              : 'Autonomous Startup OS — Cryptographic Wallet Entry'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* View 1: Main Selection (Exactly Two Primary Actions) */}
        {mode === 'select' && (
          <div className="space-y-4">
            {/* Primary Action A: Create New Wallet */}
            <button
              onClick={handleCreateWallet}
              disabled={isLoading}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-between shadow-lg shadow-blue-600/20 transition-all active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <div className="font-semibold">{isFa ? 'ایجاد کیف پول جدید' : 'Create New Wallet'}</div>
                  <div className="text-[11px] text-blue-200/70">{isFa ? 'تولید هویت امن و پروژه جدید' : 'Generate secure identity & new project'}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </button>

            {/* Primary Action B: Add Existing Wallet */}
            <button
              onClick={() => setMode('import')}
              disabled={isLoading}
              className="w-full py-4 px-5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 text-slate-200 font-medium text-sm flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Key className="w-5 h-5 text-slate-300" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <div className="font-semibold">{isFa ? 'اتصال کیف پول موجود' : 'Add Existing Wallet'}</div>
                  <div className="text-[11px] text-slate-400">{isFa ? 'بازیابی پروژه و حافظه با امضا' : 'Restore project & memory via signature'}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </button>

            <div className="pt-4 text-center">
              <span className="text-[11px] text-slate-400">
                {isFa ? 'امضای رمزنگاری شده جایگزین رمز عبور است. هویت شما کاملاً غیرمتمرکز است.' : 'Cryptographic signatures replace passwords. True sovereign identity.'}
              </span>
            </div>
          </div>
        )}

        {/* View 2: Create Wallet Confirmation */}
        {mode === 'create' && createdWallet && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 text-xs leading-relaxed">
              ⚠️ {isFa ? 'عبارت بازیابی زیر را یادداشت و در مکانی امن نگه دارید. کلید شما هرگز به سرور ارسال نمی‌شود.' : 'Save the recovery phrase below safely. Private keys are never stored on server.'}
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-[11px] text-slate-400 mb-1">{isFa ? 'آدرس عمومی کیف پول:' : 'Public Wallet Address:'}</div>
              <div className="font-mono text-xs text-blue-400 break-all">{createdWallet.address}</div>
            </div>

            <div className="p-3.5 bg-black/60 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">{isFa ? 'عبارت ۱۲ کلمه‌ای بازیابی:' : '12-Word Recovery Phrase:'}</span>
                <button
                  onClick={handleCopyPhrase}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی عبارت' : 'Copy')}</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {createdWallet.mnemonic.split(' ').map((word, idx) => (
                  <div key={idx} className="p-1.5 bg-slate-900 rounded text-center font-mono text-[11px] text-slate-300 border border-slate-800">
                    <span className="text-slate-400 mr-1">{idx + 1}.</span>{word}
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasBackedUp}
                onChange={(e) => setHasBackedUp(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>{isFa ? 'عبارت بازیابی را در محلی امن ذخیره کرده‌ام و مسئولیت نگهداری آن را می‌پذیرم.' : 'I have securely written down my recovery phrase.'}</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setMode('select')}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 text-slate-300 text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                {isFa ? 'بازگشت' : 'Back'}
              </button>
              <button
                disabled={!hasBackedUp || isLoading}
                onClick={() => {
                  const w = new Wallet(createdWallet.privateKey);
                  authenticateWithWallet(w);
                }}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  hasBackedUp && !isLoading
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isFa ? 'ورود به لایا' : 'Enter Laya'}</span>
              </button>
            </div>
          </div>
        )}

        {/* View 3: Add Existing Wallet */}
        {mode === 'import' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              {isFa
                ? 'عبارت ۱۲ کلمه‌ای یا کلید خصوصی خود را وارد کنید، یا از طریق افزونه مرورگر متصل شوید:'
                : 'Enter your 12-word phrase, private key, or connect via browser wallet:'}
            </p>

            {/* Quick Browser Wallet Option if available */}
            {typeof window !== 'undefined' && (window as any).ethereum && (
              <button
                onClick={handleConnectBrowserWallet}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-500/40 text-amber-200 text-xs font-medium hover:bg-amber-600/40 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>{isFa ? 'اتصال مستقیم با متامسک / افزونه مرورگر' : 'Connect via MetaMask / Browser Wallet'}</span>
              </button>
            )}

            <div>
              <textarea
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder={isFa ? 'عبارت ۱۲ کلمه‌ای یا کلید خصوصی (0x...)' : '12-word recovery phrase or private key (0x...)'}
                rows={3}
                className="w-full p-3 rounded-xl bg-black/60 border border-slate-800 text-slate-200 text-xs font-mono focus:border-blue-500/60 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setMode('select')}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 text-slate-300 text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                {isFa ? 'بازگشت' : 'Back'}
              </button>
              <button
                onClick={handleImportWallet}
                disabled={isLoading || !importInput.trim()}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  !isLoading && importInput.trim()
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isFa ? 'تأیید و بازیابی پروژه' : 'Verify & Restore'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
