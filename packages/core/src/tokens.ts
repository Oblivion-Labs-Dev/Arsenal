export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatTokenCount(n: number): string {
  return n.toLocaleString("en-US");
}

export interface TokenEstimate {
  promptTokens: number;
  expectedOutputTokens: number;
  totalTokens: number;
}

export function estimatePromptAndOutput(
  promptText: string,
  outputRatio = 0.25,
): TokenEstimate {
  const promptTokens = estimateTokens(promptText);
  const expectedOutputTokens = Math.ceil(promptTokens * outputRatio);
  return { promptTokens, expectedOutputTokens, totalTokens: promptTokens + expectedOutputTokens };
}
