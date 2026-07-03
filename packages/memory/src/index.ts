export interface MemoryStore {
  save(key: string, value: any): Promise<void>;
  load(key: string): Promise<any>;
}
