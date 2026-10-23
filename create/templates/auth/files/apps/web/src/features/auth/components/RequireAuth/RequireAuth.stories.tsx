import type { Meta, StoryObj } from '@storybook/react-vite';

import { tokenStore } from '@/lib/api/token';

import { authMocks, mockToken } from '../../mocks';
import { RequireAuth } from '.';

const meta = {
  component: RequireAuth,
  // Signed in; the stories below change only what `/auth/me` answers.
  beforeEach: () => {
    tokenStore.set(mockToken);
    return () => {
      tokenStore.clear();
    };
  },
} satisfies Meta<typeof RequireAuth>;
export default meta;

type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {};

export const Loading: Story = {
  parameters: { msw: { handlers: [authMocks.mePending] } },
};

export const LoadFailed: Story = {
  parameters: { msw: { handlers: [authMocks.meError] } },
};
