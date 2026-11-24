import { Context, Layer, Schema } from 'effect';

/**
 * Every environment value the app reads, in one place, validated at startup.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time: the values end up as plain text in
 * `dist/`, so never put a secret in one. Access them statically — `import.meta.env[name]` is
 * not replaced and is `undefined` in the build.
 */
const Env = Schema.Struct({
  VITE_API_URL: Schema.optional(Schema.String),
  VITE_API_MOCKING: Schema.optional(Schema.Literals(['true', 'false'])),
});

/** The variables as Vite exposes them: strings, or undefined when unset. */
interface RawEnv {
  readonly VITE_API_URL?: string | undefined;
  readonly VITE_API_MOCKING?: string | undefined;
}

/** Throws a SchemaError naming the bad variable, so a misconfigured app fails at startup. */
export const parseConfig = (raw: RawEnv) => {
  const { VITE_API_URL, VITE_API_MOCKING } = Schema.decodeUnknownSync(Env)(raw);

  return {
    // An empty value (`VITE_API_URL=` in .env.local, an unset CI variable) counts as unset: '' would
    // send every request to the page's own host, which answers with index.html.
    apiUrl: VITE_API_URL === undefined || VITE_API_URL === '' ? '/api' : VITE_API_URL,
    apiMocking: VITE_API_MOCKING === 'true',
  } as const;
};

type Config = ReturnType<typeof parseConfig>;

/**
 * The parsed values, for code outside Effect: `main.tsx` (start MSW or not) and MSW handlers
 * (their URLs). Effect code reads `AppConfig` instead, so a test can provide other values.
 */
export const config: Config = parseConfig({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_MOCKING: import.meta.env.VITE_API_MOCKING,
});

/** The config as a service: `const { apiUrl } = yield* AppConfig`. */
export class AppConfig extends Context.Service<AppConfig, Config>()('app/lib/AppConfig') {
  static readonly layer = Layer.succeed(AppConfig, config);
}
