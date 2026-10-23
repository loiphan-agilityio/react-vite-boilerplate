import { safeRedirect } from '../model';

describe('safeRedirect', () => {
  it.each([
    ['/', '/'],
    ['/tasks', '/tasks'],
    ['/tasks?status=open', '/tasks?status=open'],
    ['/tasks?status=open#top', '/tasks?status=open#top'],
  ])('keeps the path %s', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected);
  });

  it.each([
    [null],
    [''],
    ['tasks'],
    ['https://evil.example'],
    ['//evil.example'],
    ['/\\evil.example'],
    ['/\t/evil.example'],
    ['/\n/evil.example'],
    ['/\r/evil.example'],
    ['/\t/['],
    ['javascript:alert(1)'],
  ])('falls back to / for %s', (value) => {
    expect(safeRedirect(value)).toBe('/');
  });
});
