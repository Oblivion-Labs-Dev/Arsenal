export interface Tool {
  name: string;
  run(args: string[]): Promise<string>;
}
