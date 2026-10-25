# 900: Storybook is missing from the README's Run it section

## Problem

A newcomer reading the README's "Run it" section learns `pnpm dev:mock` and `pnpm dev`, but not
`pnpm storybook`, although every component ships a story file and the root has the script.

## Users

- A developer new to the project, looking for the components and their states.

## Outcome

The "Run it" section lists `pnpm storybook` with the port it opens.

## Non-goals

- Changing Storybook itself or its configuration.

## Source

Pasted for the `/web-dev:pr` trial on 2026-10-26.
