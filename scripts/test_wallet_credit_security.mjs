import { Wallet } from 'ethers';

async function main() {
  console.log('🧪 Starting Petros Wallet, Credit Ledger & Secret Security Test Suite...\n');
  const BASE_URL = 'http://127.0.0.1:3000';

  // 1. Generate local wallet
  const wallet1 = Wallet.createRandom();
  console.log('1. Generated User Wallet 1:', wallet1.address);
  if (!wallet1.mnemonic?.phrase) throw new Error('Missing mnemonic phrase');

  // 2. Request challenge nonce
  console.log('2. Requesting cryptographic challenge nonce...');
  const chRes = await fetch(`${BASE_URL}/api/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet1.address })
  });
  const chData = await chRes.json();
  console.log('   Challenge status:', chRes.status, 'Nonce:', chData.nonce);
  if (!chData.nonce || !chData.challengeMessage) throw new Error('Invalid challenge response');

  // 3. Cryptographically sign challenge
  console.log('3. Signing challenge message with private key...');
  const signature1 = await wallet1.signMessage(chData.challengeMessage);

  // 4. Verify signature & authenticate
  console.log('4. Verifying signature on server...');
  const authRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet1.address, signature: signature1 })
  });
  const authData = await authRes.json();
  console.log('   Auth status:', authRes.status, 'SessionId:', authData.session?.sessionId?.slice(0, 20) + '...');
  console.log('   Allowance:', authData.credit?.baseAllowanceSeconds / 3600, 'hours');
  if (!authData.session?.sessionId) throw new Error('Authentication failed');
  const sessionId1 = authData.session.sessionId;

  // 5. Test Replay Attack Prevention
  console.log('5. Testing Replay Attack (resubmitting same nonce & signature)...');
  const replayRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet1.address, signature: signature1 })
  });
  console.log('   Replay status (Expect 401):', replayRes.status);
  if (replayRes.status !== 401) throw new Error('Replay attack was NOT rejected!');

  // 6. Test Signature Forgery Prevention
  console.log('6. Testing Signature Forgery (claimed Address A signed by Wallet B)...');
  const wallet2 = Wallet.createRandom();
  const chRes2 = await fetch(`${BASE_URL}/api/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet1.address })
  });
  const chData2 = await chRes2.json();
  const forgedSig = await wallet2.signMessage(chData2.challengeMessage);
  const forgeRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet1.address, signature: forgedSig })
  });
  console.log('   Forgery status (Expect 401):', forgeRes.status);
  if (forgeRes.status !== 401) throw new Error('Forged signature was NOT rejected!');

  // 7. Verify /api/auth/me session resolution
  console.log('7. Validating authenticated session (/api/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${sessionId1}` }
  });
  const meData = await meRes.json();
  console.log('   Me status:', meRes.status, 'Wallet:', meData.session?.walletAddress);
  if (meData.session?.walletAddress.toLowerCase() !== wallet1.address.toLowerCase()) {
    throw new Error('Session resolved wrong wallet address');
  }

  // 8. Test Credit Ledger & 8-hour allowance
  console.log('8. Checking Credit Ledger balance...');
  const crRes = await fetch(`${BASE_URL}/api/credit/balance`, {
    headers: { 'Authorization': `Bearer ${sessionId1}` }
  });
  const crData = await crRes.json();
  console.log('   Daily allowance:', crData.totalAllowanceSeconds / 3600, 'hours, Used:', crData.usedSeconds, 'seconds');
  if (crData.totalAllowanceSeconds !== 28800) throw new Error('Standard allowance is not 8 hours');

  // 9. Test Promotion Deactivation & 8-hour Allowance Preservation
  console.log('9. Testing Promotion Policy (Formula deactivated pending approval)...');
  const promoRes = await fetch(`${BASE_URL}/api/credit/promote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionId1}`
    },
    body: JSON.stringify({ endorserWallet: wallet2.address })
  });
  const promoData = await promoRes.json();
  console.log('   Promotion status:', promoData.success, 'Hours preserved:', promoData.newTotalHours + 'h');
  console.log('   Message:', promoData.message);
  if (promoData.success !== false || promoData.newTotalHours !== 8) {
    throw new Error('Promotion formula was not strictly deactivated!');
  }

  // 10. Test Secret Management (AES-256-GCM)
  console.log('10. Testing AES-256-GCM Secret Management...');
  const rawApiKey = 'sk-ant-api03-live-test-key-safe-123456';
  const secStoreRes = await fetch(`${BASE_URL}/api/secrets/store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionId1}`
    },
    body: JSON.stringify({ provider: 'anthropic', key: rawApiKey })
  });
  const secStoreData = await secStoreRes.json();
  console.log('    Secret stored:', secStoreData.success, 'Masked Hint:', secStoreData.maskedHint);
  if (secStoreData.maskedHint.includes('live-test-key-safe')) throw new Error('Secret was not masked!');

  const secListRes = await fetch(`${BASE_URL}/api/secrets/list`, {
    headers: { 'Authorization': `Bearer ${sessionId1}` }
  });
  const secListData = await secListRes.json();
  console.log('    Masked secrets list:', secListData.secrets);

  // 11. Test Logout & Session Revocation
  console.log('11. Testing Logout & Session Revocation...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessionId1}` }
  });
  const logoutData = await logoutRes.json();
  console.log('    Logout status:', logoutData.revoked);

  const meAfterLogout = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${sessionId1}` }
  });
  console.log('    Me status after logout (Expect 401):', meAfterLogout.status);
  if (meAfterLogout.status !== 401) throw new Error('Revoked session was still accepted!');

  console.log('\n================================================================');
  console.log('🏆 ALL WALLET, CREDIT LEDGER & SECRET SECURITY TESTS PASSED!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
