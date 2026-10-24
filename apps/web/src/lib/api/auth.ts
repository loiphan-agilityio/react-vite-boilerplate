import { Context, Effect, Layer, Option } from 'effect';

/**
 * Where `ApiClient` gets the bearer token, read again for every request so a sign-in or a
 * sign-out takes effect on the next call. The template has no sign-in: `AuthToken.none` sends no
 * `Authorization` header. An app with sign-in swaps it in `src/lib/runtime.ts` for
 * `AuthToken.fromGetter(() => <the token your session holds>, onRejected)`; a 401 still reaches
 * the UI as `UnauthorizedError`, and `rejected` is told which token the API refused, so the
 * session can drop that token (and only that one: a sign-in may have replaced it meanwhile).
 */
export class AuthToken extends Context.Service<
  AuthToken,
  {
    readonly get: Effect.Effect<Option.Option<string>>;
    readonly rejected: (token: string) => Effect.Effect<void>;
  }
>()('app/lib/api/AuthToken') {
  static readonly none = Layer.succeed(AuthToken, {
    get: Effect.succeed(Option.none()),
    rejected: () => Effect.void,
  });

  static readonly fromGetter = (
    getToken: () => string | null | undefined,
    onRejected?: (token: string) => void,
  ) =>
    Layer.succeed(AuthToken, {
      get: Effect.sync(() => Option.fromNullishOr(getToken())),
      rejected: (token) =>
        Effect.sync(() => {
          onRejected?.(token);
        }),
    });
}
