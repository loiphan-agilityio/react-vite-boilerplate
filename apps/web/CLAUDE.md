# web

Single-page app: React 19, Vite 8, TypeScript 6 (strict), Effect 4, TanStack Query 5,
React Hook Form 7, shadcn/ui on Tailwind CSS 4, React Router 8. Tests: Vitest 5, React Testing
Library, MSW 3; end-to-end: Playwright. Deployed to Netlify (`netlify.toml`) by the monorepo's
CI/CD (`../../CLAUDE.md`). Package manager: pnpm. No SSR, no Next.js.

This app (package `web`) is part of a pnpm + Turborepo monorepo (see `../../CLAUDE.md`): run the
commands below from `apps/web`; the root `pnpm check` runs every package through turbo.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server. `pnpm dev:mock` (Vite mode `mock`, reads `.env.mock`) serves the API from `src/mocks` (MSW), in any shell. |
| `pnpm lint` | Oxlint (the root `oxlint.config.ts`, type-aware, `--deny-warnings`; also enforces the import rules below and anti-slop) and `prettier --check`. `pnpm lint:fix` fixes what it can and formats; run it before `pnpm check`. |
| `pnpm typecheck` | `tsc -b` |
| `pnpm test` | Vitest once, with coverage (≥ 80% lines in `src/features` and `src/lib`). `pnpm test:watch` to watch. |
| `pnpm test:e2e` | Playwright (`e2e/`, Chromium): builds the app on mocks and serves it with `vite preview`; with `E2E_BASE_URL` set, tests that URL instead. `pnpm test:e2e:install` downloads Chromium once per machine. `pnpm test:e2e:report` builds the Allure 3 report of the last run (`allurerc.ts`, into `allure-report/`) and opens it. |
| `pnpm build` | Typecheck + production build. `pnpm build:mock` builds with MSW on (`.env.mock`): what CI deploys while the app has no backend. A browser that blocks service workers still gets the app, unmocked, with a console warning. |
| `pnpm storybook` | Storybook on port 6006 (stories render inside `.storybook/story-providers.tsx`, MSW on). |
| `pnpm build-storybook` | Static Storybook build; fails when a story does not compile. |
| `pnpm check` | All six gates: lint, typecheck, test, build, Storybook build, e2e. **Run before calling work done.** |

Run each command on its own, exactly as written (no pipes or redirects): the tool result already holds the output and the exit code.

## Layout

```
src/
  app/              routes.tsx (createRoutes), providers.tsx, root-layout.tsx, route-error.tsx
  components/       shared app components, one folder per component (as in a feature, below)
  features/<name>/  one folder per feature (names below are for an `items` feature):
    schemas.ts        Effect Schemas + derived types: Item, ItemList, NewItem / NewItemInput
    model.ts          business rules as pure functions of those types
    api.ts            Effect.fn functions that call ApiClient: listItems, createItem
    queries.ts        key factory itemKeys, itemListQueryOptions(), mutation hooks useCreateItem()
    mocks.ts          createItemsHandlers(initial) + itemsMocks (MSW)
    routes.tsx        itemRoutes() — lazy route objects
    components/       one folder per component, named like its export (PascalCase):
      ItemForm/
        index.tsx                     the component itself (export const ItemForm), not a re-export
        ItemForm.stories.tsx
        __tests__/ItemForm.test.tsx
        types.ts, utils.ts, ...       only what ItemForm alone uses; a second user moves it out
  lib/
    config.ts         every env value (VITE_*), read statically and validated with Effect Schema;
                      `config` outside Effect, the `AppConfig` service inside it
    runtime.ts        AppLayer + the ManagedRuntime
    query-client.ts   createQueryClient(); query errors are typed as ApiError
    report-error.ts   reportError(): the one exit for an unexpected error (console, or a tracker)
    forms.ts          setFormErrors(): API errors → React Hook Form
    api/client.ts     ApiClient: the only way to call the backend
    api/auth.ts       AuthToken: the bearer token ApiClient sends (none until the app has sign-in)
    api/errors.ts     ApiError union + toUserMessage()
    api/run.ts        runEffect(effect, signal): Effect → Promise for TanStack Query
  mocks/            handlers.ts (all feature handlers), server.ts (Vitest), browser.ts (dev)
  test/             setup.ts, render.tsx (renderRoute, renderWithProviders)
e2e/                Playwright specs: home.spec.ts, then <feature>.spec.ts per feature
playwright.config.ts  the e2e runner: mock build + `vite preview`, or E2E_BASE_URL
allurerc.ts         the Allure 3 report of the e2e run (results in test-results/allure)
netlify.toml        Netlify: SPA redirect, cache headers, build command for git-based builds
```

The UI kit lives in `packages/ui` (`@repo/ui`): shadcn components in `packages/ui/src/components`
(import `@repo/ui/components/<name>`), `cn` in `packages/ui/src/lib/utils.ts` (import
`@repo/ui/lib/utils`), theme tokens in `packages/ui/src/styles/globals.css`. This app's
`src/styles/index.css` only imports it (`@import '@repo/ui/globals.css';`) and adds
`@source '..';`. Add a shadcn component with `pnpm exec shadcn add <name>`: run it in `apps/web`;
it writes into `packages/ui/src/components`. Never edit those files by hand.

## Code style

Lint enforces it, and `func-style` has no autofix, so write it this way from the start:

- Arrow functions only: `export const ItemList = () => { ... };`, `export const useX = () => ...`.
  `function*` stays only inside `Effect.gen` / `Effect.fn`. A component that only returns markup
  returns it directly: `export const Page = () => (<section>...</section>);`.
- Destructure objects (`const { title } = item`, props, callback arguments), use shorthand
  properties, template literals instead of `+`, `??` / `?.`, `const` (never `var`), `===`.
- A handler that returns nothing gets braces: `onClick={() => { setOpen(true); }}`, not
  `onClick={() => setOpen(true)}` (`no-confusing-void-expression`).
- Inline type imports (`import { type Item, NewItem } from './schemas'`); `pnpm lint:fix`
  fixes most of the rest and formats.
- anti-slop (part of `pnpm lint`) rejects low-evidence code: a type assertion
  without a `// SAFETY:` comment on the invariant, `as unknown as`, `unknown` or `object` in a
  function's parameters or return type (parse at the boundary instead; a catch argument is named
  `cause`), `typeof` narrowing outside a parser, `vi.mock` of a module, comparing or building
  `_tag` by hand (use `instanceof` the error class, `Match`, or the class constructor). It also
  wants a blank line before a `return` and around multi-line statements: `pnpm lint:fix` adds them.

## How data flows

`component → useQuery(xQueryOptions()) / useXMutation() → runEffect → Effect.fn in api.ts →
ApiClient → effect/http`

- **Never call `fetch` (or axios, or `XMLHttpRequest`) in app code.** Every request goes through
  `ApiClient`, which prefixes `apiUrl` from `AppConfig`, adds the `AuthToken` bearer token
  when there is one, decodes the body with the schema you pass, and
  maps every failure to an `ApiError`. Lint rejects `fetch`, `window.fetch`, `globalThis.fetch`,
  `XMLHttpRequest` and `axios`.
- **`runEffect` is the only bridge to TanStack Query.** Pass the query's `signal` so
  cancellation aborts the request. It rejects with the typed `ApiError`: branch on it with the
  error classes (`error instanceof UnauthorizedError`) or Effect's `Match` (`Match.tagsExhaustive`),
  never on `_tag` by hand (anti-slop rejects it).
- **Retries live in TanStack Query only** (queries: once, and only for `NetworkError` or a
  `ServerError` with a 5xx status; mutations: never). Do not add `HttpClient.retryTransient`.
- **Unexpected errors are reported in one place:** `createQueryClient` reports a 5xx
  `ServerError` or an `InvalidResponseError` from any query or mutation, and RouterProvider's
  `onError` (`reportRouteError`) a route that throws, both through `reportError`, all in
  `src/lib/report-error.ts`. A feature shows its error state and never logs or reports an API
  error itself; a 4xx or a `NetworkError` is the user's to see, not a bug.
- **Query keys come from a key factory** in `queries.ts`; mutations invalidate exactly the
  keys they change, and return that promise from `onSuccess`.
- **Every data screen renders four distinct states:** loading (`isPending`, not `isLoading`),
  error (with `toUserMessage` and a retry), empty (with the next action), success. Empty and
  error never look the same.
- **Forms:** `useForm<Input, unknown, Output>({ resolver, defaultValues })` with
  `effectTsResolver(Schema)` built once at module level (`Input`/`Output` are the schema's
  Encoded/Type: inferred from `defaultValues`, a literal union widens to `string`), `Controller` + shadcn `Field` / `FieldLabel` / `FieldError`,
  `data-invalid` on `Field`, `aria-invalid` on the control. Server errors go through
  `setFormErrors(form.setError, error, form.getValues())`: with the values, a message for a name
  the form has no input for shows above the submit button instead of nowhere.
- **Business rules are pure functions in the feature's `model.ts`** (what sorts first, a total,
  what counts as overdue), tested in `__tests__/model.test.ts` without rendering. Components and
  queries call them instead of computing a rule inline; a rule that needs today's date takes it as
  a parameter, so it stays pure.
- **A feature uses another feature only through its `schemas`, `model`, `queries` or `routes`.**
  Its `api`, `mocks` and `components` are internal, and lint rejects importing them from another
  feature. Imports inside a feature are relative.
- **Routes are factories** (`createRoutes()`, `<name>Routes()`): React Router mutates route
  objects when a lazy route loads, so each router needs fresh ones.

## Testing

- `renderRoute('/path')` renders the real route tree; `renderWithProviders(<X />)` renders one
  component. Both return `{ user, queryClient, router, ...rtl }`; use `user` (user-event).
  Both mount the `Toaster`, so a toast is asserted as text (`findByText`); do not mock `sonner`.
  `src/test/__tests__/toaster.test.tsx` guards that the app's `toast()` and the `<Toaster>` from
  `@repo/ui` share one sonner instance.
- MSW runs for every test with `onUnhandledFrame: 'error'`: a request without a handler fails
  the test. Drive states with `server.use(...)`; **a later `server.use()` call wins**, and
  within one call the first matching handler wins.
- Each feature's `mocks.ts` exports `create<Name>Handlers(initial)` (fresh in-memory data per
  call) and `<name>Mocks` (pending / error / validation responses). List a fixed path before a
  path with a parameter (`/tasks/stats` before `/tasks/:id`): the first match wins, and
  `:id` would match `stats`.
- Tests live in a `__tests__/` folder next to the code they test, never beside the file itself
  (`components/ItemForm/index.tsx` → `components/ItemForm/__tests__/ItemForm.test.tsx`,
  `schemas.ts` → `__tests__/schemas.test.ts`). Every component has a unit test file there that renders it
  alone with `renderWithProviders(<X />)`. The page test (`renderRoute`) covers only how the
  parts work together, not each component's cases again.
- Query by role and label, not test ids. Test all four states and every form error path.
- After a navigation to a lazy route, wait for the new page (`findBy*`) before asserting:
  until the route loads, the old page is still on screen.

## End-to-end tests

- Playwright specs live in `e2e/`, one `<feature>.spec.ts` per feature: the main flow a user
  takes through the real app (open it from the header, read the list, submit the form, see the
  result). Edge cases, error states and 422s stay in the unit tests.
- They run against the mocked API: the feature's default handlers in `src/mocks/handlers.ts`, with
  the fixtures in its `mocks.ts`, fresh on every page load. Assert on fixture values, never on
  data a backend would hold.
- Query by role and label (`page.getByRole`, `page.getByLabel`) and assert with web-first
  `await expect(locator).toBeVisible()`; never `waitForTimeout`.
- The same specs run in CI against the Netlify deploy (`E2E_BASE_URL`), so a spec never assumes
  localhost or a port.

## Stories

- Every component has a `<Name>.stories.tsx` in its folder (`components/ItemForm/index.tsx` →
  `components/ItemForm/ItemForm.stories.tsx`), with one story per state it renders, driven by the feature's
  `mocks.ts` through `parameters.msw.handlers`.
- The preview (`.storybook/preview.tsx`) wraps every story in the same providers as a test and
  starts the app's MSW worker: add no providers in a story.

## Commits

- Messages follow Conventional Commits: `type(scope): summary` (`feat`, `fix`, `docs`, `refactor`,
  `test`, `chore`...). The `commit-msg` hook rejects anything else (commitlint).
- The `pre-commit` hook runs Oxlint and Prettier on the staged files (lint-staged), then
  `pnpm typecheck`. Fix what it reports; never commit with `--no-verify`.
- The hooks are installed by husky, the root `prepare` script, which `pnpm install` runs inside a git
  repository. After a `git init` in a project already installed, run `pnpm run prepare` to turn them
  on: `pnpm install` finds nothing to do and skips it.
- `.gitattributes` keeps every file LF, so a checkout with `core.autocrlf=true` still passes Prettier.

## Library versions newer than most training data

These APIs changed recently and are easy to recall wrong. Lint catches some; the rest compile
fine and fail at runtime.

**Learning more about Effect.** This repository uses the Effect TypeScript library. Before
writing any Effect code, first read `node_modules/effect/AGENTS.md` **completely**, and follow
the links in the file when required. If you need to learn more about particular Effect APIs
and concepts that the guide doesn't cover, search through the source code in
`node_modules/effect/src`.

- **Effect 4:** services are `Context.Service`, not `Context.Tag` / `Effect.Service`. HTTP is
  `effect/http`, not `@effect/platform`. Errors are `Schema.TaggedError`. Decode with
  `Schema.decodeUnknownEffect` (failure: `SchemaError`), or `Schema.decodeUnknownSync` in tests.
  Catch-all is `Effect.catch`. Functions are `Effect.fn('name')(function* () { ... })`. Validation
  messages go through `Schema.check(Schema.isMinLength(1, { message }))`.
- **React Hook Form + Effect:** `@hookform/resolvers` 6 ships `effectTsResolver` for Effect 4
  (`@hookform/resolvers/effect-ts`); it takes the Schema itself. Older docs say it is Effect-3
  only; that was version 5. No `zodResolver`, no `Schema.toStandardSchemaV1` wrapper.
- **React Router 8:** there is no `react-router-dom`. Import from `react-router`, and
  `RouterProvider` from `react-router/dom`.
- **MSW 3:** `http` / `HttpResponse` from `msw/http`; `delay` / `bypass` / `passthrough` from
  `msw/utils/<name>`; `setupServer` from `msw/node`, `setupWorker` from `msw/browser`; no
  `rest.get`; `onUnhandledRequest` is now `onUnhandledFrame`. Precedence: a later `server.use()`
  call wins; within one call the first matching handler wins.
- **TanStack Query 5:** `isPending` for the first load; object syntax only; `queryOptions()`.
- **Tailwind 4:** CSS-first. Theme tokens live in `packages/ui/src/styles/globals.css`
  (`@theme inline`), shared by every app; a token only this app uses goes in
  `src/styles/index.css` after the `@import`. There is still no `tailwind.config.js`. Use tokens
  (`bg-background`, `text-muted-foreground`), not raw colors.
- **Vitest 5:** `clearMocks` is on by default; `vi.mock` must be at the top level of a file; never
  `jest.*`. Mock the API with MSW, never `vi.stubGlobal('fetch')` or `vi.mock` of an `api.ts`.
- **Storybook 10:** `Meta` / `StoryObj` from `@storybook/react-vite`; `@storybook/test` is gone
  (`play` gets `canvas` and `userEvent` from its context). API mocks go in
  `parameters.msw.handlers`; there is no `msw-storybook-addon`.
- **TypeScript 6:** `baseUrl` is deprecated; `paths` works without it.

## Skills

Skills (the `web-dev` plugin, or its `skills/`, `references/`, `scripts/` and `agents/` copied
into `.claude/` or `~/.claude/`). They run in this folder (`apps/web`) and refuse the monorepo
root (see `../../CLAUDE.md`). To stay tier `template` for them, this app must keep `src/lib/api/client.ts`
(`ApiClient`), `src/test/render.tsx`, and in its `package.json` the stack dependencies (`react`,
`vite`, `effect`, `@tanstack/react-query`, `react-hook-form`) and `packageManager`.

**Paths: this file wins over the skills.** Their references were written for a single-package
app. Where they name `@/components/ui/<x>`, `src/components/ui/`, `cn` from `@/lib/utils`, or
tokens in `src/styles/index.css`, use `@repo/ui/components/<x>`, `packages/ui/src/components/`,
`@repo/ui/lib/utils` and `packages/ui/src/styles/globals.css`.

- `develop` — the entry point (`/web-dev:develop <request>`): detects the project, sorts the
  request and runs the skills below. A whole app from one description → a plan
  (`docs/plan.md`), the scaffold, every feature, gates, and the app running on mocks; decides
  instead of asking.
- `project-setup` — scaffold a new app from this template. Not inside this monorepo: add an app
  with the recipe in `../../CLAUDE.md`.
- `feature-development` — ticket → schema, API, queries, form, UI, tests. Loads `api-integration` for
  endpoints beyond list + create, and `ui-development` when the ticket has a design.
- `api-integration` — add or change an endpoint: schema, `ApiClient` call, query/mutation, MSW.
- `ui-development` — a design (screenshot, mockup, Figma, DESIGN.md; asks once if none) → a UI
  that matches it: tokens, shadcn components, states, tests, visual check.

Companion skills (installed by the web-dev plugin's `install-companions.sh`): `shadcn`, `react-router-data-mode`,
`vite`, `vitest`, `vercel-react-best-practices`, `vercel-composition-patterns`,
`react-hook-form`, `react-testing`.

**Priority when they disagree:** this file and the five project skills, then
`node_modules/effect/AGENTS.md` and the installed type definitions, then companion skills.
Companions are generic: ignore their Next.js / SSR / RSC advice, zod resolvers, Jest,
`react-router-dom`, raw `fetch` examples and loader-first data fetching.
