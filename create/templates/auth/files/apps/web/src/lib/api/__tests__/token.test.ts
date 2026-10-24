import { tokenStore } from '../token';

describe('tokenStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('drops the token a 401 rejected', () => {
    tokenStore.set('old');
    tokenStore.reject('old');
    expect(tokenStore.get()).toBeNull();
  });

  it('keeps a newer token when a 401 answers a request sent with an older one', () => {
    tokenStore.set('old');
    tokenStore.set('new');
    tokenStore.reject('old');
    expect(tokenStore.get()).toBe('new');
  });

  it('tells subscribers when the token changes, until they unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = tokenStore.subscribe(listener);
    tokenStore.set('a');
    tokenStore.clear();
    unsubscribe();
    tokenStore.set('b');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
