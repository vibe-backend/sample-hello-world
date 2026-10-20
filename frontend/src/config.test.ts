import { describe, expect, it } from 'vitest';
import { counterPath, DEFAULT_MOCK_MODE, helloPath, incrementPath, parseMockMode } from './api/config';
describe('API configuration', () => {
  it.each([
    ['all', 'all'], ['counter', 'counter'], ['off', 'off'],
    ['1', 'all'], ['true', 'all'], ['0', 'off'], ['false', 'off'],
    ['unknown', DEFAULT_MOCK_MODE], [undefined, DEFAULT_MOCK_MODE],
  ])('parses %s', (input, expected) => { expect(parseMockMode(input)).toBe(expected); });
  it('uses the project default tenant routes', () => {
    expect(helloPath()).toBe('/api/web/v1/hello');
    expect(counterPath()).toBe('/api/web/v1/counter');
    expect(incrementPath()).toBe('/api/web/v1/increment-counter');
  });
});
