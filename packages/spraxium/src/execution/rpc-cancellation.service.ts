import { RpcFailureMapper } from './rpc-failure.mapper';

export class RpcCancellation {
  static async waitForSettled(work: Iterable<Promise<unknown>>, timeoutMs: number): Promise<void> {
    if (timeoutMs <= 0) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        Promise.allSettled(work),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  static wait<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      const cancel = () => reject(RpcFailureMapper.fromCancellation(signal));
      work.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
      if (signal.aborted) cancel();
      else signal.addEventListener('abort', cancel, { once: true });
    });
  }
}
