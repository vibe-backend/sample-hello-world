export type MockMode = 'all' | 'counter' | 'off';
// The counter API ships with the backend; mocks are opt-in (PUBLIC_API_MOCK=all|counter).
export const DEFAULT_MOCK_MODE: MockMode = 'off';
export function parseMockMode(value?: string): MockMode {
  if (value === 'all' || value === '1' || value === 'true') return 'all';
  if (value === 'off' || value === '0' || value === 'false') return 'off';
  return value === 'counter' ? 'counter' : DEFAULT_MOCK_MODE;
}
export const mode = parseMockMode(import.meta.env.PUBLIC_API_MOCK);
export const slug = import.meta.env.PUBLIC_API_SLUG ?? 'dev';
const delay = Number(import.meta.env.PUBLIC_API_MOCK_DELAY_MS ?? 300);
export const delayMs = Number.isFinite(delay) && delay >= 0 ? delay : 300;
const segment = (value: string) => value === '' ? '' : `/${encodeURIComponent(value)}`;
export const helloPath = (value = slug) => `/hello/v1${segment(value)}/hello`;
export const counterPath = (value = slug) => `/counter/v1${segment(value)}/counter`;
export const incrementPath = (value = slug) => `${counterPath(value)}/increment`;
