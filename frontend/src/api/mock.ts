import type { Api } from './client';
export function createMockBackend({ delayMs, initialCount = 0 }: { delayMs: number; initialCount?: number }): Api {
  let count = initialCount;
  const wait = (signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return; }
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, delayMs);
    signal?.addEventListener('abort', abort, { once: true });
  });
  return {
    async getHello(signal) { await wait(signal); return { message: 'hello world' }; },
    async getCount(signal) { await wait(signal); return { count }; },
    async increment(signal) { await wait(signal); count += 1; return { count }; },
  };
}
