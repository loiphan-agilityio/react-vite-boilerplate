# create-react-vite-boilerplate

Creates a project from this repo. It asks whether to include authentication.

```
pnpm create react-vite-boilerplate my-app           # asks: Include authentication? (y/N)
pnpm create react-vite-boilerplate my-app --auth    # no question (also --no-auth)
```

Then `cd my-app`, `git init`, `pnpm install`, `pnpm dev:mock`. With authentication, sign in as
`demo@example.com` / `password`.

- **No auth:** exactly the project at `main`.
- **Auth:** the project plus `apps/web/src/features/auth` (email + password → JWT bearer token,
  sign out, `protectedRoutes()` for routes that need a signed-in user, `/auth/me`), with MSW mocks.
  No sign-up and no refresh token.

`--from <dir>` copies the working tree of a local checkout (uncommitted files included) instead of
cloning; the tests use it. The CLI clones `https://github.com/loiphan-agilityio/react-vite-boilerplate.git`,
so a private repo needs git access.

## How the auth option works

1. The repo is cloned (or copied) and `.git` removed.
2. `templates/auth/files/` is copied over it. A file that already exists is an error, never an
   overwrite.
3. `templates/auth/patches.json` is applied: a list of `{ file, find, replace }`. **`find` must match
   exactly once**, or the CLI stops, names the file and the text, and deletes the output folder. So
   when the base changes under a patch, the next run fails loudly instead of silently overwriting
   the change.
4. `create/` and the `<!-- template-only -->` block of the root `CLAUDE.md` are removed.

## Maintaining it

After changing a file listed in `patches.json`, or anything in `create/`:

```
node --test create/index.test.js        # both variants generate, every patch matches
node create/index.js /tmp/rvb-auth --from . --auth
cd /tmp/rvb-auth && pnpm install && pnpm check
```

The overlay is not type-checked or linted in this repo (its `@/` imports only resolve inside an
app). Change it inside a generated app, run `pnpm check` there, and copy the files back into
`templates/auth/files/`. A file listed in `patches.json` that you change in the base: update its
`find` text to match.

## Publishing

```
cd create && npm publish
```

The package ships only `index.js`: the templates come from the clone.
