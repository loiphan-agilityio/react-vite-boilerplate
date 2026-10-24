import { parseConfig } from '../config';

describe('parseConfig', () => {
  it('applies defaults when variables are not set', () => {
    expect(parseConfig({})).toEqual({ apiUrl: '/api', apiMocking: false });
  });

  it('treats an empty VITE_API_URL as unset', () => {
    expect(parseConfig({ VITE_API_URL: '' }).apiUrl).toBe('/api');
  });

  it('reads the values that are set', () => {
    expect(parseConfig({ VITE_API_URL: 'https://api.test', VITE_API_MOCKING: 'true' })).toEqual({
      apiUrl: 'https://api.test',
      apiMocking: true,
    });
  });

  it('rejects a value outside the schema', () => {
    expect(() => parseConfig({ VITE_API_MOCKING: 'yes' })).toThrow();
  });
});
