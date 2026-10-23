import { screen } from '@testing-library/react';

import { tokenStore } from '@/lib/api/token';
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
