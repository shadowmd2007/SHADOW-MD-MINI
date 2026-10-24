// lib/pair.js - FIXED
export async function getPairingCode(sock, number) {
  const num = number.replace(/[^0-9]/g, '');
  if (!num) throw new Error('Number required');
  const code = await sock.requestPairingCode(num);
  return code;
}