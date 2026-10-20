import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApi } from './api/client';
import { createMockBackend } from './api/mock';

function setup(body: unknown, status = 200) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  return { fetchImpl, api: createApi({ mode: 'off', fetchImpl }) };
}
describe('typed API client', () => {
  it('accepts hello and safe nonnegative counts', async () => {
    await expect(setup({ message: 'hello' }).api.getHello()).resolves.toEqual({ message: 'hello' });
    await expect(setup({ value: 0 }).api.getCount()).resolves.toEqual({ count: 0 });
  });
  it.each([null, {}, { message: 1 }])('rejects invalid hello %j', async body => {
    await expect(setup(body).api.getHello()).rejects.toMatchObject({ kind: 'invalid' });
  });
  it.each([null, {}, { value: '1' }, { value: -1 }, { value: 1.5 }, { value: Number.MAX_SAFE_INTEGER + 1 }])('rejects invalid count %j', async body => {
    await expect(setup(body).api.getCount()).rejects.toMatchObject({ kind: 'invalid' });
  });
  it('preserves HTTP status', async () => {
    const error = await setup({}, 503).api.getHello().catch((error: unknown) => error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 503 });
  });
  it('reports malformed JSON', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('not json'));
    await expect(createApi({ mode: 'off', fetchImpl }).getHello()).rejects.toMatchObject({ kind: 'invalid' });
  });
  it('reports network failures', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    await expect(createApi({ mode: 'off', fetchImpl }).getHello()).rejects.toMatchObject({ kind: 'network' });
  });
  it('posts to the increment path without a body', async () => {
    const { api, fetchImpl } = setup({ value: 1 });
    await api.increment();
    expect(fetchImpl).toHaveBeenCalledWith('/api/web/v1/increment-counter', expect.objectContaining({ method: 'POST', headers: { Accept: 'application/json' } }));
    expect(fetchImpl.mock.calls[0]?.[1]?.body).toBeUndefined();
  });
  it('uses real hello and mocked counter in counter mode', async () => {
    const { fetchImpl } = setup({ message: 'real hello' });
    const mock = { getHello: vi.fn(), getCount: vi.fn().mockResolvedValue({ count: 4 }), increment: vi.fn().mockResolvedValue({ count: 5 }) };
    const api = createApi({ mode: 'counter', fetchImpl, mock });
    await expect(api.getHello()).resolves.toEqual({ message: 'real hello' });
    await expect(api.getCount()).resolves.toEqual({ count: 4 });
    await expect(api.increment()).resolves.toEqual({ count: 5 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(mock.getHello).not.toHaveBeenCalled();
  });
  it('never touches the mock in off mode', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{"message":"real"}'))
      .mockImplementation(async () => new Response('{"value":1}'));
    const forbidden = () => { throw new Error('Mock touched'); };
    const mock = { getHello: forbidden, getCount: forbidden, increment: forbidden };
    const api = createApi({ mode: 'off', fetchImpl, mock });
    await api.getHello(); await api.getCount(); await api.increment();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
  it('serves all operations in memory in all mode', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const api = createApi({ mode: 'all', fetchImpl, mock: createMockBackend({ delayMs: 0, initialCount: 7 }) });
    await expect(api.getHello()).resolves.toEqual({ message: 'hello world' });
    await expect(api.getCount()).resolves.toEqual({ count: 7 });
    await expect(api.increment()).resolves.toEqual({ count: 8 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
