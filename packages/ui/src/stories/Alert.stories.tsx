import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlert, Info } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '../components/alert';

const meta = {
  title: 'UI/Alert',
  component: Alert,
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Info />
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Your changes are saved automatically.</AlertDescription>
      </>
    ),
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: (
      <>
        <CircleAlert />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>The request failed. Try again in a moment.</AlertDescription>
      </>
    ),
  },
};
