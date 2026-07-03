export interface ChatModel {
  chat(prompt: string): Promise<string>;
}
