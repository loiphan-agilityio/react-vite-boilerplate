import { screen } from '@testing-library/react';

import { tokenStore } from '@/lib/api/token';
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
});
