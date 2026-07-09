export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatTokenCount(n: number): string {
  return n.toLocaleString("en-US");
}
