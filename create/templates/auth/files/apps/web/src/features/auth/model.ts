/**
 * Where to go after signing in. The value is resolved with the browser's own URL parser and kept
 * only if it stays on this origin, so a crafted `/login?redirect=` cannot send the user elsewhere:
 * `https://evil.example`, `//evil.example`, `/\evil.example` and `/<TAB>/evil.example` (browsers
 * drop tabs and newlines, which turns it into `//evil.example`) all fall back to `/`. A regex
 * cannot list every such quirk; React Router would follow the result with `location.assign`.
 * Dot segments resolve on this origin but can leave a path that starts with `//` (`/.//evil.example`
 * becomes `//evil.example`), which would point at another host once followed, so it falls back too.
 */
export const safeRedirect = (value: string | null) => {
  if (!value?.startsWith('/')) return '/';
  try {
    const { origin, pathname, search, hash } = new URL(value, window.location.origin);
    const path = `${pathname}${search}${hash}`;
    return origin === window.location.origin && !path.startsWith('//') ? path : '/';
  } catch {
    return '/';
  }
};
