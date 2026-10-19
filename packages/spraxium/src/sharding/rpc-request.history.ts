import type { RpcRequestExpiry } from './interfaces/rpc-request-expiry.interface';

export class RpcRequestHistory {
  private readonly ids = new Set<string>();
  private readonly expirations: Array<RpcRequestExpiry> = [];

  get size(): number {
    return this.ids.size;
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  add(id: string, deadline: number): void {
    if (this.ids.has(id)) return;
    this.ids.add(id);
    const entry = { id, deadline };
    let index = this.expirations.length;
    this.expirations.push(entry);

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.expirations[parent].deadline <= deadline) break;
      this.expirations[index] = this.expirations[parent];
      index = parent;
    }

    this.expirations[index] = entry;
  }

  expire(now: number): void {
    while (this.expirations.length && this.expirations[0].deadline <= now) {
      this.ids.delete(this.expirations[0].id);
      this.removeEarliest();
    }
  }

  clear(): void {
    this.ids.clear();
    this.expirations.length = 0;
  }

  private removeEarliest(): void {
    const last = this.expirations.pop();
    if (!last || this.expirations.length === 0) return;
    let index = 0;
    let child = 1;

    while (child < this.expirations.length) {
      const right = child + 1;
      if (
        right < this.expirations.length &&
        this.expirations[right].deadline < this.expirations[child].deadline
      ) {
        child = right;
      }
      if (last.deadline <= this.expirations[child].deadline) break;
      this.expirations[index] = this.expirations[child];
      index = child;
      child = index * 2 + 1;
    }

    this.expirations[index] = last;
  }
}
