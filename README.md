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

`pnpm check` runs lint, typecheck, tests, build and the Storybook build. Run it before committing.
