# Gremlins

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

The repo includes a small opt-in `gremlins.js` layer for exploratory MP robustness checks. This sits alongside the deterministic `@playwright/test` suite and does not run as part of `npm test`.

The gremlins coverage lives under [tests/gremlins](../tests/gremlins), uses its own config in [playwright.gremlins.config.ts](../playwright.gremlins.config.ts), and injects `node_modules/gremlins.js/dist/gremlins.min.js` with `page.addInitScript(...)` before starting each horde.

For the underlying library, see the official project page: <https://github.com/marmelab/gremlins.js>.

## Current safe targets

The first safe targets are:

- MP public home page
- MP public FAQ page
- MP authenticated language settings page

These targets were chosen to stay away from destructive AP CRUD paths and higher-risk mutation flows.

## Default behavior

The helper in [tests/gremlins/support/gremlins.ts](../tests/gremlins/support/gremlins.ts) keeps the default horde conservative and reproducible:

- prints the chosen seed so a failure can be replayed
- defaults to a small action count and pace
- captures browser `console.error`, uncaught page errors, crashes, and meaningful same-origin request failures
- fails if the page becomes unusable after the attack

## Example usage

```bash
# Run the default opt-in gremlins pack
npm run test:gremlins

# Run the same pack in headed mode
npm run test:gremlins:headed

# Run the gremlins MP project explicitly
npm run test:gremlins:mp

# Replay a failure with the same seed
GREMLINS_SEED=1337 npm run test:gremlins

# Tune the horde locally
GREMLINS_SEED=20260321 GREMLINS_ACTIONS=90 GREMLINS_DELAY_MS=20 npm run test:gremlins

# Open the dedicated gremlins HTML report
npm run test:gremlins:report
```

## Why it is opt-in

These tests are intentionally opt-in because they are exploratory rather than deterministic product assertions. They are useful for finding client-side brittleness, but they should not replace the normal AP, MP, API, Lighthouse, or BDD coverage.

For the current authenticated MP target, the helper ignores the specific OneSignal native-push unsupported-environment error that Playwright can trigger during exploratory runs. That keeps the signal focused on portal survivability rather than browser-push support.

## What not to target

Do not target the following with gremlins in this repo:

- AP create, update, or delete workflows
- payment, checkout, or invoice collection paths
- account/profile mutation forms unless the test is purpose-built to isolate them
- notification opt-in or other browser-permission flows
