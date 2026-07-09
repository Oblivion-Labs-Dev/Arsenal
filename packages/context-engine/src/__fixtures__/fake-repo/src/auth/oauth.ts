export function refreshToken(token: string): string {
  if (!token) throw new Error("missing token");
  return `${token}-refreshed`;
}

export function validateOAuthConfig(config: { clientId: string }) {
  return Boolean(config.clientId);
}
