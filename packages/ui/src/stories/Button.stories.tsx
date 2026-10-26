import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';

import { Button } from '../components/button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Button' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outline: Story = { args: { variant: 'outline' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Link: Story = { args: { variant: 'link' } };
export const Disabled: Story = { args: { disabled: true } };

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus data-icon="inline-start" /> Add item
      </>
    ),
  },
};

export const Icon: Story = {
  args: { size: 'icon', 'aria-label': 'Add', children: <Plus /> },
};
