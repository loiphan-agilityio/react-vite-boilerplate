import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { tokenStore } from '@/lib/api/token';
import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { authMocks, mockToken, mockUser } from '../../../mocks';
import { RequireAuth } from '..';

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    tokenStore.set(mockToken);
  });

  it('shows who is signed in', async () => {
    renderWithProviders(<RequireAuth />);
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('shows a loading state while it asks who is signed in', () => {
    server.use(authMocks.mePending);
    renderWithProviders(<RequireAuth />);
    expect(screen.getByRole('status', { name: 'Loading your account' })).toBeInTheDocument();
  });

  it('shows the error with a Retry that loads the account', async () => {
    server.use(authMocks.meError);
    const { user } = renderWithProviders(<RequireAuth />);
    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
  });

  it('lets the user sign out from the error state', async () => {
    server.use(authMocks.meError);
    const { user, router } = renderWithProviders(<RequireAuth />);
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(tokenStore.get()).toBeNull();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('starts over when another tab signs in as someone else', async () => {
    const otherUser = { ...mockUser, id: '2', name: 'Other User' };
    // Answers the other tab's token; the default handler answers mockToken.
    server.use(
      http.get(`${config.apiUrl}/auth/me`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer other-token'
          ? HttpResponse.json(otherUser)
          : undefined,
      ),
    );
    renderWithProviders(<RequireAuth />);
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();

    act(() => {
      localStorage.setItem('auth-token', 'other-token');
      window.dispatchEvent(new StorageEvent('storage', { key: 'auth-token' }));
    });
    expect(await screen.findByText(otherUser.name)).toBeInTheDocument();
  });
});
