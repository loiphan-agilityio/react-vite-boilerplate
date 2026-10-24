import { screen } from '@testing-library/react';
import { http } from 'msw/http';

import { tokenStore } from '@/lib/api/token';
import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { mockPassword, mockToken, mockUser } from '../mocks';

const signIn = async (user: ReturnType<typeof renderRoute>['user']) => {
  await user.type(await screen.findByLabelText('Email'), mockUser.email);
  await user.type(screen.getByLabelText('Password'), mockPassword);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('authentication', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sends a visitor to /login, then back to the page after signing in and out', async () => {
    const { user, router } = renderRoute('/');
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?redirect=%2F');

    await signIn(user);
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(router.state.location.pathname).toBe('/login');
    expect(tokenStore.get()).toBeNull();
  });

  it('sends a visitor whose token the API rejects back to /login', async () => {
    tokenStore.set('expired');
    renderRoute('/');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('drops a token the API rejects, so signing in again does not send it', async () => {
    const sent: (string | null)[] = [];
    // Returns nothing, so the request falls through to the default login handler.
    server.use(
      http.post(`${config.apiUrl}/auth/login`, ({ request }) => {
        sent.push(request.headers.get('Authorization'));
      }),
    );
    tokenStore.set('expired');
    const { user } = renderRoute('/');
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(tokenStore.get()).toBeNull();

    await signIn(user);
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
    expect(sent).toEqual([null]);
  });

  it("does not keep the previous session's cached data after signing in", async () => {
    tokenStore.set('expired');
    const { user, queryClient } = renderRoute('/');
    queryClient.setQueryData(['invoices'], ['previous user invoice']);

    await signIn(user);
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
    expect(queryClient.getQueryData(['invoices'])).toBeUndefined();
  });

  it('returns to the query string and hash of the page after signing in', async () => {
    const { user, router } = renderRoute('/?tab=open#top');
    await signIn(user);
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
    expect(router.state.location).toMatchObject({
      pathname: '/',
      search: '?tab=open',
      hash: '#top',
    });
  });

  it('does not follow a redirect to another site', async () => {
    const { user, router } = renderRoute('/login?redirect=%2F%2Fevil.example');
    await signIn(user);
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('keeps a signed-in visitor on the page', async () => {
    tokenStore.set(mockToken);
    renderRoute('/');
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
  });
});
