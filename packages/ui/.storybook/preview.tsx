import '../src/styles/globals.css';

import type { Preview } from '@storybook/react-vite';

import { Toaster } from '../src/components/sonner';

const preview: Preview = {
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster richColors />
      </>
    ),
  ],
};

export default preview;
