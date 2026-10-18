import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { ApiError, type Api } from './api/client';

function makeApi() {
  return {
    getHello: vi.fn<Api['getHello']>().mockResolvedValue({ message: 'hello world' }),
    getCount: vi.fn<Api['getCount']>().mockResolvedValue({ count: 3 }),
    increment: vi.fn<Api['increment']>().mockResolvedValue({ count: 4 }),
  };
}
beforeEach(() => { vi.spyOn(navigator, 'language', 'get').mockReturnValue('en'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('counter page', () => {
  it('loads both operations in parallel and displays the results', async () => {
    const api = makeApi();
    let resolveHello!: (value: { message: string }) => void;
    api.getHello.mockReturnValue(new Promise(resolve => { resolveHello = resolve; }));
    render(<App api={api} />);
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expect(api.getCount).toHaveBeenCalledTimes(1);
    await act(async () => { resolveHello({ message: 'hello world' }); });
    expect(await screen.findByText('hello world')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
  it('increments and announces the count while preventing duplicate requests', async () => {
    const api = makeApi();
    let resolveIncrement!: (value: { count: number }) => void;
    api.increment.mockReturnValue(new Promise(resolve => { resolveIncrement = resolve; }));
    const user = userEvent.setup();
    render(<App api={api} />);
    const button = await screen.findByRole('button', { name: '+1 Add one' });
    await user.click(button); await user.click(button);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(api.increment).toHaveBeenCalledTimes(1);
    await act(async () => { resolveIncrement({ count: 4 }); });
    expect(await screen.findByText('4')).toBeTruthy();
    expect(screen.getByText('Current count: 4').getAttribute('aria-live')).toBe('polite');
  });
  it('recovers from a load error by reloading both operations', async () => {
    const api = makeApi();
    api.getHello.mockRejectedValueOnce(new ApiError('http', 503));
    const user = userEvent.setup();
    render(<App api={api} />);
    expect((await screen.findByRole('alert')).textContent).toContain('503');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('hello world')).toBeTruthy();
    expect(api.getHello).toHaveBeenCalledTimes(2);
    expect(api.getCount).toHaveBeenCalledTimes(2);
  });
  it('keeps the last count on increment failure and retries the increment', async () => {
    const api = makeApi();
    api.increment.mockRejectedValueOnce(new ApiError('network'));
    const user = userEvent.setup();
    render(<App api={api} />);
    await user.click(await screen.findByRole('button', { name: '+1 Add one' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('4')).toBeTruthy();
    expect(api.getCount).toHaveBeenCalledTimes(1);
  });
  it('switches language and the document lang', async () => {
    const user = userEvent.setup();
    render(<App api={makeApi()} />);
    await screen.findByText('hello world');
    expect(document.documentElement.lang).toBe('en');
    await user.click(screen.getByRole('button', { name: '中文' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hello World 計數器');
    expect(document.documentElement.lang).toBe('zh-Hant');
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(document.documentElement.lang).toBe('en');
  });
  it('defaults zh locales to Traditional Chinese', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('zh-HK');
    render(<App api={makeApi()} mockMode="off" />);
    await screen.findByText('hello world');
    expect(document.documentElement.lang).toBe('zh-Hant');
    expect(screen.queryByText(/mock/i)).toBeNull();
  });
  it('aborts pending work on unmount', async () => {
    const api = makeApi();
    api.getHello.mockImplementation(signal => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const { unmount } = render(<App api={api} />);
    const signal = api.getHello.mock.calls[0]?.[0];
    unmount();
    await waitFor(() => { expect(signal?.aborted).toBe(true); });
  });
});
