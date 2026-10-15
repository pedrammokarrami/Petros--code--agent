export function sanitizeShellCommand(cmd: string): { valid: boolean; command?: string; error?: string } {
  const clean = (cmd || '').trim().replace(/[\r\n]+/g, ' ');
  if (/rm\s+-rf\s+\/|mkfs|>.*dev.*sda/.test(clean)) {
    return { valid: false, error: 'Blocked' };
  }
  return { valid: true, command: clean };
}
