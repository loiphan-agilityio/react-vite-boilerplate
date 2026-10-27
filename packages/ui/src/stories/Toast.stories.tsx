import type { Meta, StoryObj } from '@storybook/react-vite';
import { toast } from 'sonner';

import { Button } from '../components/button';

// The Toaster is mounted once by the Storybook preview.
const meta = {
  title: 'UI/Toast',
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { children: 'Show success', onClick: () => toast.success('Saved') },
};

export const Failure: Story = {
  args: {
    children: 'Show error',
    variant: 'destructive',
    onClick: () => toast.error('Could not save'),
  },
};
