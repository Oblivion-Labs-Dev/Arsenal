export class Metrics {
  private counts = new Map<string, number>();
  inc(name: string) {
    this.counts.set(name, (this.counts.get(name) || 0) + 1);
  }
}
