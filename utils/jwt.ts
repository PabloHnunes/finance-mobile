export function decodeJwtPayload(token: string): Record<string, any> {
  const base64 = token.split('.')[1];
  const base64Fixed = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64Fixed + '=='.slice(0, (4 - (base64Fixed.length % 4)) % 4);

  const binary = typeof atob === 'function'
    ? atob(padded)
    : Buffer.from(padded, 'base64').toString('binary');

  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}
