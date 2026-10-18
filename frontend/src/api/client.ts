import { counterPath, delayMs, helloPath, incrementPath, mode, slug, type MockMode } from './config';
import { createMockBackend } from './mock';
export interface Api {
  getHello(signal?: AbortSignal): Promise<{ message: string }>;
  getCount(signal?: AbortSignal): Promise<{ count: number }>;
  increment(signal?: AbortSignal): Promise<{ count: number }>;
}
export class ApiError extends Error {
  constructor(public kind: 'http' | 'network' | 'invalid', public status?: number) {
    super(`API ${kind} error${status === undefined ? '' : ` (${status})`}`);
    this.name = 'ApiError';
  }
}
export function createApi(options: { mode: MockMode; slug: string; fetchImpl?: typeof fetch; mock?: Api }): Api {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const mock = options.mode === 'off' ? undefined : options.mock ?? createMockBackend({ delayMs });
  async function request(path: string, method: string, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetchImpl(path, { method, headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new ApiError('http', response.status);
      try { return await response.json(); } catch { throw new ApiError('invalid'); }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('network');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  async function count(path: string, method: string, signal?: AbortSignal) {
    const data = await request(path, method, signal);
    if (typeof data !== 'object' || data === null || !('count' in data) || typeof data.count !== 'number' || !Number.isSafeInteger(data.count) || data.count < 0) throw new ApiError('invalid');
    return { count: data.count };
  }
  return {
    async getHello(signal) {
      if (options.mode === 'all' && mock) return mock.getHello(signal);
      const data = await request(helloPath(options.slug), 'GET', signal);
      if (typeof data !== 'object' || data === null || !('message' in data) || typeof data.message !== 'string') throw new ApiError('invalid');
      return { message: data.message };
    },
    getCount: (signal) => mock ? mock.getCount(signal) : count(counterPath(options.slug), 'GET', signal),
    increment: (signal) => mock ? mock.increment(signal) : count(incrementPath(options.slug), 'POST', signal),
  };
}
export const api = createApi({ mode, slug });
