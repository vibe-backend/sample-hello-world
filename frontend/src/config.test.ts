import { describe, expect, it } from 'vitest';
import { counterPath, DEFAULT_MOCK_MODE, helloPath, incrementPath, parseMockMode } from './api/config';
describe('API configuration', () => {
  it.each([
    ['all', 'all'], ['counter', 'counter'], ['off', 'off'],
    ['1', 'all'], ['true', 'all'], ['0', 'off'], ['false', 'off'],
    ['unknown', DEFAULT_MOCK_MODE], [undefined, DEFAULT_MOCK_MODE],
  ])('parses %s', (input, expected) => { expect(parseMockMode(input)).toBe(expected); });
  it.each([
    ['dev', '/hello/v1/dev/hello', '/counter/v1/dev/counter'],
    ['', '/hello/v1/hello', '/counter/v1/counter'],
  ])('builds tenant paths for %s', (slug, hello, counter) => {
    expect(helloPath(slug)).toBe(hello);
    expect(counterPath(slug)).toBe(counter);
    expect(incrementPath(slug)).toBe(`${counter}/increment`);
  });
  it('encodes the slug as one segment', () => { expect(helloPath('a/b')).toBe('/hello/v1/a%2Fb/hello'); });
});
