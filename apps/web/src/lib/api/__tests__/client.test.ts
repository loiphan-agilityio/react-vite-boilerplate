import { Effect, Layer, Schema } from 'effect';
import { http, HttpResponse } from 'msw/http';

import { AppConfig, config } from '@/lib/config';
import { server } from '@/mocks/server';

import { AuthToken } from '../auth';
import { ApiClient } from '../client';
import {
  ForbiddenError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  ServerError,
  UnauthorizedError,
  ValidationError,
} from '../errors';
import { runEffect } from '../run';

const Item = Schema.Struct({ id: Schema.Number });
const url = `${config.apiUrl}/items/1`;

const getItem = Effect.gen(function* () {
  const api = yield* ApiClient;

  return yield* api.get('/items/1', Item);
});

/** Runs getItem and returns the rejection, so each test can assert on the ApiError it maps to. */
const failure = async (response: () => Response) => {
  server.use(http.get(url, response));

  try {
    await runEffect(getItem);
  } catch (error) {
    return error;
  }

  throw new Error('expected the request to fail');
};

describe('ApiClient', () => {
  it('decodes a 2xx body with the schema', async () => {
    server.use(http.get(url, () => HttpResponse.json({ id: 1 })));
    await expect(runEffect(getItem)).resolves.toEqual({ id: 1 });
  });

  it.each([
    [401, UnauthorizedError],
    [403, ForbiddenError],
    [404, NotFoundError],
    [500, ServerError],
    [503, ServerError],
  ])('maps status %i to %o', async (status, errorClass) => {
    const error = await failure(() => HttpResponse.json({}, { status }));
    expect(error).toBeInstanceOf(errorClass);
  });

  it('maps 422 field errors to ValidationError.fields', async () => {
    const error = await failure(() =>
      HttpResponse.json({ message: 'Invalid', errors: { name: 'Taken' } }, { status: 422 }),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ message: 'Invalid', fields: { name: 'Taken' } });
  });

  it('maps a network failure to NetworkError', async () => {
    const error = await failure(() => HttpResponse.error());
    expect(error).toBeInstanceOf(NetworkError);
  });

  it('maps a body that does not match the schema to InvalidResponseError', async () => {
    const error = await failure(() => HttpResponse.json({ id: 'not-a-number' }));
    expect(error).toBeInstanceOf(InvalidResponseError);
  });
});

describe('ApiClient layers', () => {
  /** Runs getItem on ApiClient built from the given config and token layers. */
  const runWith = (layer: Layer.Layer<AppConfig | AuthToken>) =>
    Effect.runPromise(getItem.pipe(Effect.provide(ApiClient.layer.pipe(Layer.provide(layer)))));

  const appConfig = (apiUrl: string) => Layer.succeed(AppConfig, { ...config, apiUrl });

  it('prefixes the apiUrl from AppConfig', async () => {
    server.use(http.get('https://other.test/items/1', () => HttpResponse.json({ id: 2 })));
    await expect(
      runWith(Layer.mergeAll(appConfig('https://other.test'), AuthToken.none)),
    ).resolves.toEqual({ id: 2 });
  });

  it('sends no Authorization header with AuthToken.none', async () => {
    server.use(
      http.get(url, ({ request }) =>
        HttpResponse.json({ id: request.headers.has('authorization') ? 0 : 1 }),
      ),
    );
    await expect(
      runWith(Layer.mergeAll(appConfig(config.apiUrl), AuthToken.none)),
    ).resolves.toEqual({ id: 1 });
  });

  it('sends the token from AuthToken.fromGetter as a bearer token', async () => {
    server.use(
      http.get(url, ({ request }) =>
        request.headers.get('authorization') === 'Bearer secret'
          ? HttpResponse.json({ id: 1 })
          : HttpResponse.json({}, { status: 401 }),
      ),
    );
    await expect(
      runWith(
        Layer.mergeAll(
          appConfig(config.apiUrl),
          AuthToken.fromGetter(() => 'secret'),
        ),
      ),
    ).resolves.toEqual({ id: 1 });
  });

  it.each([
    ['the token a 401 rejected', 'secret', 401, ['secret']],
    ['nothing when no token was sent', null, 401, []],
    ['nothing for another error', 'secret', 403, []],
  ])('reports %s to AuthToken.rejected', async (_, token, status, expected) => {
    server.use(http.get(url, () => HttpResponse.json({}, { status })));
    const rejected: string[] = [];
    await expect(
      runWith(
        Layer.mergeAll(
          appConfig(config.apiUrl),
          AuthToken.fromGetter(
            () => token,
            (value) => rejected.push(value),
          ),
        ),
      ),
    ).rejects.toBeDefined();
    expect(rejected).toEqual(expected);
  });
});
