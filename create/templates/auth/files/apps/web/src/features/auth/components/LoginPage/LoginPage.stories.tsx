import type { Meta, StoryObj } from '@storybook/react-vite';

import { authMocks, mockPassword, mockUser } from '../../mocks';
import { LoginPage } from '.';

const meta = { component: LoginPage } satisfies Meta<typeof LoginPage>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Types the credentials and submits, to reach the states that need a submit. */
const submit =
  (email: string, password: string): Story['play'] =>
  async ({ canvas, userEvent }) => {
    if (email) await userEvent.type(canvas.getByLabelText('Email'), email);
    if (password) await userEvent.type(canvas.getByLabelText('Password'), password);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
  };

export const Default: Story = {};

export const InvalidInput: Story = { play: submit('', '') };

export const WrongPassword: Story = { play: submit(mockUser.email, `${mockPassword}-wrong`) };

export const SigningIn: Story = {
  parameters: { msw: { handlers: [authMocks.loginPending] } },
  play: submit(mockUser.email, mockPassword),
};

export const ServerError: Story = {
  parameters: { msw: { handlers: [authMocks.loginError] } },
  play: submit(mockUser.email, mockPassword),
};
