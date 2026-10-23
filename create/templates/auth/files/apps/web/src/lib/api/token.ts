const KEY = 'auth-token';

/**
 * The signed-in user's bearer token. `AuthToken.fromGetter(tokenStore.get)` in `runtime.ts` sends
 * it with every request; it is read again each time, so `set` and `clear` apply to the next call.
 *
 * shortcut: localStorage can be read by any script on the page (XSS), switch to an httpOnly cookie
 * when the backend supports it.
 */
export const tokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (token: string) => {
    localStorage.setItem(KEY, token);
  },
  clear: () => {
    localStorage.removeItem(KEY);
  },
};
