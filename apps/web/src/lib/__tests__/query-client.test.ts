import {
  type ApiError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  ServerError,
} from '@/lib/api/errors';

import { createQueryClient } from '../query-client';

describe('createQueryClient', () => {
  const { queries, mutations } = createQueryClient().getDefaultOptions();
  const retry = queries?.retry;
  assert(retry instanceof Function, 'queries.retry should be a function');

  it('retries a transient failure once', () => {
    expect(retry(0, new ServerError({ status: 503 }))).toBe(true);
    expect(retry(1, new ServerError({ status: 503 }))).toBe(false);
  });

  it('never retries a 4xx answer or a mutation', () => {
    expect(retry(0, new NotFoundError())).toBe(false);
    // A 4xx without its own ApiError case (409, 429) arrives as a ServerError.
    expect(retry(0, new ServerError({ status: 409 }))).toBe(false);
    expect(mutations?.retry).toBe(0);
  });
});

describe('createQueryClient error reporting', () => {
  const fail = async (error: ApiError) => {
    const queryClient = createQueryClient();

    await queryClient
      .query({ queryKey: ['todos'], queryFn: () => Promise.reject(error), retry: false })
      .catch(() => undefined);
    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(error) })
      .execute(undefined)
      .catch(() => undefined);
  };

  it('reports a 5xx and a body that breaks its schema, from queries and mutations', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await fail(new ServerError({ status: 500 }));
    await fail(new InvalidResponseError({ message: 'Expected string' }));

    expect(consoleError.mock.calls.map(([label]) => String(label))).toEqual([
      '[query ["todos"]]',
      '[mutation]',
      '[query ["todos"]]',
      '[mutation]',
    ]);
  });

  it('does not report what the screen explains: a 4xx or a lost connection', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await fail(new NotFoundError());
    await fail(new ServerError({ status: 409 }));
    await fail(new NetworkError());

    expect(consoleError).not.toHaveBeenCalled();
  });
});
