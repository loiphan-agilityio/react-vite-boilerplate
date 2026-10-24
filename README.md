# boilerplate

A pnpm + Turborepo monorepo: a React 19 + Vite single-page app in `apps/web`, shared packages in
`packages/`. The stack, layout and rules are in [CLAUDE.md](CLAUDE.md) and
[apps/web/CLAUDE.md](apps/web/CLAUDE.md).

## Run it

```
pnpm install
pnpm dev:mock   # the API is answered by MSW mocks: no backend needed
pnpm dev        # needs a real backend at VITE_API_URL (copy apps/web/.env.example to apps/web/.env.local)
```

## Check

`pnpm check` runs lint, typecheck, tests, build, the Storybook build and the Playwright end-to-end
tests (`pnpm test:e2e:install` downloads Chromium once per machine). Run it before committing;
`pnpm check:report` runs the same gates and prints a checklist with the unit and e2e pass rates
and coverage. While coding, `pnpm test:watch` re-runs the affected tests on every save.
CI/CD (`.github/workflows/ci.yml`, deployed to Netlify) is described in [CLAUDE.md](CLAUDE.md),
with what to change before real users (a backend instead of the mocks, among others).
