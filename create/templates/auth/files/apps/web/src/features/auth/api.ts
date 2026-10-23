import { Effect } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { type Credentials, Session, User } from './schemas';

export const signIn = Effect.fn('signIn')(function* (credentials: Credentials) {
  const api = yield* ApiClient;
  return yield* api.post('/auth/login', credentials, Session);
});

export const getMe = Effect.fn('getMe')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/auth/me', User);
});
