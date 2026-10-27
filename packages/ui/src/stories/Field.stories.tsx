import type { Meta, StoryObj } from '@storybook/react-vite';

import { Field, FieldDescription, FieldError, FieldLabel } from '../components/field';
import { Input } from '../components/input';

const meta = {
  title: 'UI/Field',
  component: Field,
  args: { className: 'w-80' },
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" placeholder="you@example.com" />
        <FieldDescription>We never share it.</FieldDescription>
      </>
    ),
  },
};

export const Invalid: Story = {
  render: (args) => (
    <Field {...args} data-invalid>
      <FieldLabel htmlFor="email-invalid">Email</FieldLabel>
      <Input id="email-invalid" type="email" defaultValue="not-an-email" aria-invalid />
      <FieldError errors={[{ message: 'Enter a valid email address.' }]} />
    </Field>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <Field {...args} data-disabled>
      <FieldLabel htmlFor="email-disabled">Email</FieldLabel>
      <Input id="email-disabled" disabled defaultValue="you@example.com" />
    </Field>
  ),
};
