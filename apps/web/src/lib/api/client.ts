import { Context, Effect, flow, Layer, Match, Option, Schema } from 'effect';
import {
  FetchHttpClient,
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from 'effect/http';

import { AppConfig } from '@/lib/config';

import { AuthToken } from './auth';
import {
  type ApiError,
  ForbiddenError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  ServerError,
  UnauthorizedError,
  ValidationError,
} from './errors';

/** Body the API sends with a 400/422: a message and optional per-field messages. */
const ValidationBody = Schema.Struct({
  message: Schema.optional(Schema.String),
  errors: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

const fromStatus = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<never, ApiError> => {
  switch (response.status) {
    case 401:
      return Effect.fail(new UnauthorizedError());
    case 403:
      return Effect.fail(new ForbiddenError());
    case 404:
      return Effect.fail(new NotFoundError());
    case 400:
    case 422:
      return response.json.pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(ValidationBody)),
        // A malformed error body still means "invalid input", just without field details.
        Effect.catch(() => Effect.succeed({ message: undefined, errors: undefined })),
        Effect.flatMap(({ message, errors }) =>
          Effect.fail(
            new ValidationError({
              message: message ?? 'Please check the highlighted fields.',
              fields: errors ?? {},
            }),
          ),
        ),
      );
    default:
      return Effect.fail(new ServerError({ status: response.status }));
  }
};

/** Maps Effect's transport-level errors onto the app's `ApiError` union. */
const toApiError = (
  error: HttpClientError.HttpClientError | Schema.SchemaError,
): Effect.Effect<never, ApiError> =>
  Match.value(error).pipe(
    Match.tag('SchemaError', ({ message }) => Effect.fail(new InvalidResponseError({ message }))),
    Match.orElse(({ message, reason }) =>
      Match.value(reason).pipe(
        Match.tagsExhaustive({
          StatusCodeError: ({ response }) => fromStatus(response),
          DecodeError: () => Effect.fail(new InvalidResponseError({ message })),
          EmptyBodyError: () => Effect.fail(new InvalidResponseError({ message })),
          TransportError: () => Effect.fail(new NetworkError()),
          EncodeError: () => Effect.fail(new NetworkError()),
          InvalidUrlError: () => Effect.fail(new NetworkError()),
        }),
      ),
    ),
  );

/**
 * The only way the app talks to the backend. Every method decodes the response with the
 * schema you pass and fails with an `ApiError`, so callers never see raw HTTP errors.
 *
 * Retries are owned by TanStack Query (see query-client.ts); do not add
 * `HttpClient.retryTransient` here or every retry multiplies.
 */
export class ApiClient extends Context.Service<
  ApiClient,
  {
    readonly get: <S extends Schema.Constraint>(
      path: string,
      schema: S,
      options?: { readonly urlParams?: Record<string, string> },
    ) => Effect.Effect<S['Type'], ApiError, S['DecodingServices']>;
    readonly post: <S extends Schema.Constraint>(
      path: string,
      // The outbound boundary: the body is JSON-encoded as given (a feature passes its own Schema
      // type) and nothing reads it here, so it stays unknown.
      // oxlint-disable-next-line anti-slop/no-unknown-parameters
      body: unknown,
      schema: S,
    ) => Effect.Effect<S['Type'], ApiError, S['DecodingServices']>;
    readonly put: <S extends Schema.Constraint>(
      path: string,
      // The outbound boundary: the body is JSON-encoded as given (a feature passes its own Schema
      // type) and nothing reads it here, so it stays unknown.
      // oxlint-disable-next-line anti-slop/no-unknown-parameters
      body: unknown,
      schema: S,
    ) => Effect.Effect<S['Type'], ApiError, S['DecodingServices']>;
    readonly patch: <S extends Schema.Constraint>(
      path: string,
      // The outbound boundary: the body is JSON-encoded as given (a feature passes its own Schema
      // type) and nothing reads it here, so it stays unknown.
      // oxlint-disable-next-line anti-slop/no-unknown-parameters
      body: unknown,
      schema: S,
    ) => Effect.Effect<S['Type'], ApiError, S['DecodingServices']>;
    readonly delete: (path: string) => Effect.Effect<void, ApiError>;
  }
>()('app/lib/api/ApiClient') {
  static readonly layer = Layer.effect(
    ApiClient,
    Effect.gen(function* () {
      const { apiUrl } = yield* AppConfig;
      const auth = yield* AuthToken;

      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest(
          flow(HttpClientRequest.prependUrl(apiUrl), HttpClientRequest.acceptJson),
        ),
        HttpClient.filterStatusOk,
      );

      // `Authorization: Bearer <token>` whenever AuthToken has one (see auth.ts). The token is read
      // once per request, so a 401 names the token it rejected (`AuthToken.rejected`).
      const execute = <A, R>(
        request: HttpClientRequest.HttpClientRequest,
        handle: (
          response: HttpClientResponse.HttpClientResponse,
        ) => Effect.Effect<A, HttpClientError.HttpClientError | Schema.SchemaError, R>,
      ) =>
        auth.get.pipe(
          Effect.flatMap((token) =>
            client
              .execute(
                Option.match(token, {
                  onNone: () => request,
                  onSome: (value) => HttpClientRequest.bearerToken(request, value),
                }),
              )
              .pipe(
                Effect.flatMap(handle),
                Effect.catch(toApiError),
                Effect.tapError((error) =>
                  error instanceof UnauthorizedError && Option.isSome(token)
                    ? auth.rejected(token.value)
                    : Effect.void,
                ),
              ),
          ),
        );

      const send = <S extends Schema.Constraint>(
        request: HttpClientRequest.HttpClientRequest,
        schema: S,
      ) => execute(request, HttpClientResponse.schemaBodyJson(schema));

      return ApiClient.of({
        get: (path, schema, { urlParams = {} } = {}) =>
          send(HttpClientRequest.get(path, { urlParams }), schema),
        post: (path, body, schema) =>
          send(HttpClientRequest.post(path).pipe(HttpClientRequest.bodyJsonUnsafe(body)), schema),
        put: (path, body, schema) =>
          send(HttpClientRequest.put(path).pipe(HttpClientRequest.bodyJsonUnsafe(body)), schema),
        patch: (path, body, schema) =>
          send(HttpClientRequest.patch(path).pipe(HttpClientRequest.bodyJsonUnsafe(body)), schema),
        delete: (path) => execute(HttpClientRequest.delete(path), () => Effect.void),
      });
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));
}
