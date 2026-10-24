const KEY = 'auth-token';

const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

/**
 * The signed-in user's bearer token. `AuthToken.fromGetter(tokenStore.get, tokenStore.reject)` in
 * `runtime.ts` sends it with every request; it is read again each time, so `set` and `clear` apply
 * to the next call. `subscribe` lets `RequireAuth` (`useSyncExternalStore`) leave a protected page
 * as soon as the token goes, here or in another tab.
 *
 * shortcut: localStorage can be read by any script on the page (XSS), switch to an httpOnly cookie
 * when the backend supports it.
 */
export const tokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (token: string) => {
    localStorage.setItem(KEY, token);
    notify();
  },
  clear: () => {
    localStorage.removeItem(KEY);
    notify();
  },
  /** The API answered 401 to `token`: drop it, unless a sign-in has replaced it since. */
  reject: (token: string) => {
    if (localStorage.getItem(KEY) === token) tokenStore.clear();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    // Another tab signing in or out changes the same key; `key` is null when storage is cleared.
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  },
};
