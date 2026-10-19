import { describe, expect, it } from 'vitest';
import { RpcRequestHistory } from '../src/sharding/rpc-request.history';

describe('shard replay history', () => {
  it('expires requests by deadline regardless of their arrival order', () => {
    const history = new RpcRequestHistory();
    history.add('long', 300);
    history.add('short', 100);
    history.add('medium', 200);
    history.expire(100);
    expect(history.has('short')).toBe(false);
    expect(history.has('medium')).toBe(true);
    expect(history.has('long')).toBe(true);
    history.expire(299);
    expect(history.size).toBe(1);
    history.expire(300);
    expect(history.size).toBe(0);
  });

  it('handles interleaved deadlines and repeated expiration without losing live IDs', () => {
    const history = new RpcRequestHistory();
    for (let index = 0; index < 128; index++) history.add(String(index), ((index * 37) % 128) + 1);
    for (const now of [0, 25, 64, 100, 128]) {
      history.expire(now);
      let remaining = 0;
      for (let index = 0; index < 128; index++) {
        const live = ((index * 37) % 128) + 1 > now;
        expect(history.has(String(index))).toBe(live);
        if (live) remaining++;
      }
      expect(history.size).toBe(remaining);
    }
  });

  it('retains a duplicate only until its original deadline and releases all state on shutdown', () => {
    const history = new RpcRequestHistory();
    history.add('same', 100);
    history.add('same', 1000);
    expect(history.size).toBe(1);
    history.expire(100);
    expect(history.has('same')).toBe(false);
    history.add('same', 200);
    history.clear();
    expect(history.size).toBe(0);
    history.add('same', 300);
    history.expire(200);
    expect(history.has('same')).toBe(true);
  });
});
