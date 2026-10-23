import { screen } from '@testing-library/react';

import { tokenStore } from '@/lib/api/token';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { authMocks, mockPassword, mockToken, mockUser } from '../../../mocks';
import { LoginPage } from '..';

const signIn = async (
  user: ReturnType<typeof renderWithProviders>['user'],
  email: string,
  password: string,
) => {
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows a message under each empty field and sends nothing', async () => {
    const { user } = renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('rejects a malformed email', async () => {
    const { user } = renderWithProviders(<LoginPage />);
    await signIn(user, 'not-an-email', mockPassword);
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('stores the token on success', async () => {
    const { user } = renderWithProviders(<LoginPage />);
    await signIn(user, mockUser.email, mockPassword);
    await vi.waitFor(() => {
      expect(tokenStore.get()).toBe(mockToken);
    });
  });

  it('says so when the email or password is wrong', async () => {
    const { user } = renderWithProviders(<LoginPage />);
    await signIn(user, mockUser.email, 'wrong');
    expect(await screen.findByText('Wrong email or password.')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('shows the API error for any other failure', async () => {
    server.use(authMocks.loginError);
    const { user } = renderWithProviders(<LoginPage />);
    await signIn(user, mockUser.email, mockPassword);
    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
  });

  it('disables the button while signing in', async () => {
    server.use(authMocks.loginPending);
    const { user } = renderWithProviders(<LoginPage />);
    await signIn(user, mockUser.email, mockPassword);
    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled();
  });
});
