import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from '../components/separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <div className="w-60 text-sm">
      Above
      <Separator {...args} className="my-2" />
      Below
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div className="flex h-5 items-center gap-2 text-sm">
      Left
      <Separator {...args} />
      Right
    </div>
  ),
};
