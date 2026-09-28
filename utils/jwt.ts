export function decodeJwtPayload(token: string): Record<string, any> {
  const base64 = token.split('.')[1];
  const base64Fixed = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64Fixed + '=='.slice(0, (4 - (base64Fixed.length % 4)) % 4);

  // Hermes (RN >= 0.74) e a web expõem atob nativamente
  const binary = atob(padded);

  const bytes = Uint8Array.from(binary, (c: string) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}
