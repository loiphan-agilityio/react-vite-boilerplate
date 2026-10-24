import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';

import type { Credentials, User } from './schemas';

const loginUrl = `${config.apiUrl}/auth/login`;
const meUrl = `${config.apiUrl}/auth/me`;

export const mockUser: User = { id: '1', email: 'demo@example.com', name: 'Demo User' };
export const mockPassword = 'password';
export const mockToken = 'mock-token';

/** The mock API: one demo account, and `/auth/me` answers only to the token `/auth/login` issued. */
export const createAuthHandlers = () => [
  http.post<never, Credentials>(loginUrl, async ({ request }) => {
    const { email, password } = await request.json();

    return email === mockUser.email && password === mockPassword
      ? HttpResponse.json({ token: mockToken, user: mockUser })
      : HttpResponse.json({}, { status: 401 });
  }),
  http.get(meUrl, ({ request }) =>
    request.headers.get('Authorization') === `Bearer ${mockToken}`
      ? HttpResponse.json(mockUser)
      : HttpResponse.json({}, { status: 401 }),
  ),
];

/** Responses for the states the defaults never produce; pass one to `server.use()` or a story. */
export const authMocks = {
  loginPending: http.post(loginUrl, () => delay('infinite')),
  loginError: http.post(loginUrl, () => HttpResponse.json({}, { status: 500 })),
  mePending: http.get(meUrl, () => delay('infinite')),
  meError: http.get(meUrl, () => HttpResponse.json({}, { status: 500 })),
};
