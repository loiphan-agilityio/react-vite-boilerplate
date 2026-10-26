# create-react-vite-turbo

Creates a project from this repo. It asks whether to build a landing page or a web app, and for a
web app whether to include authentication.

```
pnpm create react-vite-turbo my-app                  # asks both questions
pnpm create react-vite-turbo my-app --app --auth     # no question (also --no-auth)
pnpm create react-vite-turbo my-site --landing       # a landing page: no sign-in
```

Then `cd my-app`, `git init`, `pnpm install`, `pnpm dev:mock` (`pnpm dev` for a landing page).
With authentication, sign in as `demo@example.com` / `password`.

- **Web app, no auth:** exactly the project at `main`.
- **Auth:** the project plus `apps/web/src/features/auth` (email + password → JWT bearer token,
  sign out, `protectedRoutes()` for routes that need a signed-in user, `/auth/me`), with MSW mocks.
  No sign-up and no refresh token.
- **Landing page:** the project with `apps/web/src/app/home-page.tsx` replaced by one public
  marketing page (hero, features, how it works, FAQ, a call to action), Open Graph and Twitter tags,
  `sitemap.xml` and a `Sitemap:` line in `robots.txt` (replace `www.example.com`), and a build
  and e2e tests without mocks (`pnpm build`). A landing page calls no API, so it drops the API
  layer (`src/lib/api`, config, forms, the query client), the MSW mocks and their dependencies
  (Effect, TanStack Query, React Hook Form, MSW); `pnpm install` updates the lockfile.
  `--landing --auth` is refused.

The project is named after its folder (`my-app`: the root `package.json`, the README and
`CLAUDE.md` headings, the page title); `--name <name>` names it otherwise, for a caller that
generates into a temporary folder.

`--from <dir>` copies the working tree of a local checkout (uncommitted files included) instead of
cloning; the tests use it. The CLI clones `https://github.com/loiphan-agilityio/react-vite-boilerplate.git`,
so a private repo needs git access.

## How the templates work

Each option is a template in `templates/<name>/` (`landing`, `auth`), applied in that order:

1. The repo is cloned (or copied) and `.git` removed.
2. The paths in `templates/<name>/remove.json` (optional) are deleted, so a template can replace a
   file of the base.
3. `templates/<name>/files/` is copied over it. A file that already exists is an error, never an
   overwrite.
4. `templates/<name>/patches.json` is applied: a list of `{ file, find, replace }`. **`find` must match
   exactly once**, or the CLI stops, names the file and the text, and deletes the output folder. So
   when the base changes under a patch, the next run fails loudly instead of silently overwriting
   the change.
5. `create/` and the `<!-- template-only -->` block of the root `CLAUDE.md` are removed, and
   `boilerplate` gives way to the project's name.

## Maintaining it

After changing a file listed in `patches.json`, or anything in `create/`:

```
node --test create/index.test.js        # every variant generates, every patch matches
node create/index.js /tmp/rvb-auth --from . --app --auth   # or --landing
cd /tmp/rvb-auth && pnpm install && pnpm check
```

The overlay is not type-checked or linted in this repo (its `@/` imports only resolve inside an
app). Change it inside a generated app, run `pnpm check` there, and copy the files back into
`templates/<name>/files/`. A file listed in `patches.json` that you change in the base: update its
`find` text to match.

## Publishing

```
cd create && npm publish
```

The package ships only `index.js`: the templates come from the clone.
