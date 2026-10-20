export type MockMode = 'all' | 'counter' | 'off';
// The counter API ships with the backend; mocks are opt-in (PUBLIC_API_MOCK=all|counter).
export const DEFAULT_MOCK_MODE: MockMode = 'off';
export function parseMockMode(value?: string): MockMode {
  if (value === 'all' || value === '1' || value === 'true') return 'all';
  if (value === 'off' || value === '0' || value === 'false') return 'off';
  return value === 'counter' ? 'counter' : DEFAULT_MOCK_MODE;
}
export const mode = parseMockMode(import.meta.env.PUBLIC_API_MOCK);
const delay = Number(import.meta.env.PUBLIC_API_MOCK_DELAY_MS ?? 300);
export const delayMs = Number.isFinite(delay) && delay >= 0 ? delay : 300;
export const helloPath = () => '/api/web/v1/hello';
export const counterPath = () => '/api/web/v1/counter';
export const incrementPath = () => '/api/web/v1/increment-counter';
