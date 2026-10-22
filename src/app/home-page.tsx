import { Terminal } from 'lucide-react';

import effect from '@/assets/tech/effect.svg';
import msw from '@/assets/tech/msw.svg';
import react from '@/assets/tech/react.svg';
import reactHookForm from '@/assets/tech/react-hook-form.svg';
import reactRouter from '@/assets/tech/react-router.svg';
import shadcn from '@/assets/tech/shadcn-ui.svg';
import storybook from '@/assets/tech/storybook.svg';
import tailwind from '@/assets/tech/tailwindcss.svg';
import tanstackQuery from '@/assets/tech/tanstack-query.svg';
import typescript from '@/assets/tech/typescript.svg';
import vite from '@/assets/tech/vite.svg';
import vitest from '@/assets/tech/vitest.svg';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const stack = [
  { logo: react, name: 'React 19', text: 'Concurrent UI with function components.' },
  { logo: vite, name: 'Vite 8', text: 'Instant dev server, fast production builds.' },
  { logo: typescript, name: 'TypeScript 6', text: 'Strict mode end to end.' },
  { logo: effect, name: 'Effect 4', text: 'Typed HTTP client, config and errors.' },
  { logo: tanstackQuery, name: 'TanStack Query 5', text: 'Server state with caching and retries.' },
  { logo: reactHookForm, name: 'React Hook Form 7', text: 'Forms validated by Effect Schema.' },
  { logo: reactRouter, name: 'React Router 8', text: 'Lazy route objects, per-route errors.' },
  { logo: tailwind, name: 'Tailwind CSS 4', text: 'CSS-first theme tokens.' },
  { logo: shadcn, name: 'shadcn/ui', text: 'Accessible components you own.' },
  { logo: vitest, name: 'Vitest 5', text: 'Fast tests with coverage gates.' },
  { logo: msw, name: 'MSW 3', text: 'One set of API mocks for dev, tests and stories.' },
  { logo: storybook, name: 'Storybook 10', text: 'Every component state, documented.' },
];

const commands = [
  ['pnpm dev:mock', 'run the app against MSW mocks'],
  ['pnpm test:watch', 'run tests while you edit'],
  ['pnpm storybook', 'browse components on port 6006'],
  ['pnpm check', 'run all gates before you ship'],
];

export const HomePage = () => (
  <div className="flex flex-col gap-16">
    <section className="relative flex flex-col items-center gap-6 pt-8 text-center">
      <div
        aria-hidden
        className="absolute inset-x-0 -top-24 -z-10 mx-auto h-72 max-w-2xl rounded-full bg-gradient-to-r from-brand-cyan/30 to-brand-purple/30 blur-3xl"
      />
      <Badge variant="secondary">React · Effect · shadcn/ui</Badge>
      <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-6xl">
        Build your next app on a{' '}
        <span className="bg-gradient-to-r from-brand-cyan via-primary to-brand-purple bg-clip-text text-transparent">
          solid foundation
        </span>
      </h1>
      <p className="max-w-2xl text-balance text-lg text-muted-foreground">
        A typed, tested single-page app template. Edit <code className="font-mono">src/app</code> to
        start, or add a feature folder under <code className="font-mono">src/features</code>.
      </p>
    </section>

    <section aria-labelledby="stack-heading" className="flex flex-col gap-6">
      <h2
        id="stack-heading"
        className="scroll-mt-20 font-heading text-2xl font-semibold tracking-tight"
      >
        What is inside
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stack.map(({ logo, name, text }) => (
          <li key={name}>
            <Card className="h-full transition-shadow hover:ring-primary/50">
              <CardHeader>
                <span
                  aria-hidden
                  className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted"
                >
                  <img src={logo} alt="" className="size-5 object-contain" />
                </span>
                <CardTitle>{name}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="start-heading" className="flex flex-col gap-6">
      <h2
        id="start-heading"
        className="scroll-mt-20 font-heading text-2xl font-semibold tracking-tight"
      >
        Get started
      </h2>
      <Card>
        <ul className="flex flex-col divide-y px-(--card-spacing)">
          {commands.map(([command, text]) => (
            <li
              key={command}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <code className="flex items-center gap-2 font-mono text-sm">
                <Terminal aria-hidden className="size-4 text-primary" />
                {command}
              </code>
              <span className="text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  </div>
);
