import { baseConfig } from '@repo/storybook-config/main';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  ...baseConfig,
  // The UI kit's stories too, so the deployed Storybook shows the kit beside the app.
  stories: ['../src/**/*.stories.tsx', '../../../packages/ui/src/**/*.stories.tsx'],
  // Serves public/mockServiceWorker.js, which the MSW worker in preview.tsx registers.
  staticDirs: ['../public'],
};

export default config;
