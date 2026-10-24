import { Match, Schema } from 'effect';

/** The request never got a response: offline, DNS failure, CORS, connection reset. */
export class NetworkError extends Schema.TaggedError<NetworkError>()('NetworkError', {}) {}

/** 401 — the user is not signed in, or the session expired. */
export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  'UnauthorizedError',
  {},
) {}

/** 403 — signed in, but not allowed to do this. */
export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()('ForbiddenError', {}) {}

/** 404 — the resource does not exist (or the user may not know it exists). */
export class NotFoundError extends Schema.TaggedError<NotFoundError>()('NotFoundError', {}) {}

/**
 * 400/422 — the server rejected the input. `fields` maps a field name to its message, so a
 * form can hand each one to `setError` and show it next to the right input.
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()('ValidationError', {
  message: Schema.String,
  fields: Schema.Record(Schema.String, Schema.String),
}) {}

/** Any other non-2xx response. */
export class ServerError extends Schema.TaggedError<ServerError>()('ServerError', {
  status: Schema.Number,
}) {}

/**
 * A 2xx response whose body does not match the schema: the API contract drifted. This is a
 * bug to report, not something the user can fix, so it is never shown as "no results".
 */
export class InvalidResponseError extends Schema.TaggedError<InvalidResponseError>()(
  'InvalidResponseError',
  { message: Schema.String },
) {}

/** Every way an API call can fail. This is also TanStack Query's `error` type (see query-client.ts). */
export type ApiError =
  | NetworkError
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | ValidationError
  | ServerError
  | InvalidResponseError;

/** The message to show a user for an API failure. */
export const toUserMessage = (error: ApiError): string =>
  Match.value(error).pipe(
    Match.tagsExhaustive({
      NetworkError: () => 'Could not reach the server. Check your connection and try again.',
      UnauthorizedError: () => 'Your session has expired. Please sign in again.',
      ForbiddenError: () => 'You do not have permission to do this.',
      NotFoundError: () => 'We could not find what you were looking for.',
      ValidationError: ({ message }) => message,
      ServerError: () => 'Something went wrong on our side. Please try again.',
      InvalidResponseError: () => 'The server sent an unexpected response. Please try again later.',
    }),
  );
