import { baseConfig } from '@repo/storybook-config/main';
import tailwindcss from '@tailwindcss/vite';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  ...baseConfig,
  stories: ['../src/**/*.stories.tsx'],
  // The package has no vite.config.ts: Tailwind is added here.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
  }),
};

export default config;
