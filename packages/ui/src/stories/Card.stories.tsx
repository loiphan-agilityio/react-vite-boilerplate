import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/card';

const meta = {
  title: 'UI/Card',
  component: Card,
  args: { className: 'w-80' },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Project</CardTitle>
          <CardDescription>Created two days ago.</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>Card content goes here.</CardContent>
        <CardFooter>
          <Button>Open</Button>
        </CardFooter>
      </>
    ),
  },
};
