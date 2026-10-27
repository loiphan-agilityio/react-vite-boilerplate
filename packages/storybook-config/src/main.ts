import type { StorybookConfig } from '@storybook/react-vite';

/**
 * What every Storybook in the repo shares; each `.storybook/main.ts` adds its `stories`. The
 * framework and addons are resolved from the package that runs Storybook, so it declares them.
 */
export const baseConfig = {
  addons: ['@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
} satisfies Omit<StorybookConfig, 'stories'>;
