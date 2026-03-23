# BDD tests

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [Testing utilities](testing-utilities.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

The repo includes a small `playwright-bdd` proof of concept that sits alongside the existing `@playwright/test` suite rather than replacing it. It lives under [tests/bdd](../tests/bdd), uses its own config in [playwright.bdd.config.ts](../playwright.bdd.config.ts), and keeps the always-on example set intentionally small:

- configured MP member login reaches the authenticated dashboard
- opt-in utility features cover richer booking and resource-seeding flows without turning them into normal CI assertions

The generated Playwright specs are written to `tests/bdd/.features-gen/` and are ignored by git. That same generated-spec path is also how the opt-in utility features are run locally, including the MP, AP, and API booking utilities plus the API-first meeting-room seed utility.

For BDD-driven utilities that are meant to support manual testing rather than normal CI assertions, see [Testing utilities](testing-utilities.md). The main current examples are the booking utility and the add-only API-first meeting-room seed utility, each with standalone cleanup support.

The booking utility is split across MP, AP, and API variants to demonstrate that the framework can drive the same kind of manual-test setup through multiple surfaces. That three-way seeding setup is intentionally broader than most teams actually need day to day, and it should be read as a showcase example rather than a default pattern to copy everywhere.

## Example Gherkin

```gherkin
@bdd @mp @authenticated
Feature: MP member login
  As a configured member
  I want to sign in to the member portal
  So that I can reach my dashboard

  Scenario: configured member login reaches dashboard
    Given I am on the member portal login page
    When I sign in with the configured member credentials
    Then I should reach the authenticated member dashboard
```

## Example usage

```bash
# Generate the Playwright specs from the feature files
npm run test:bdd:gen

# Generate and run the BDD examples
npm run test:bdd

# Generate and run the BDD examples in headed mode
npm run test:bdd:headed

# Generate and run just the MP login BDD example
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/mp/member-login.feature.spec.js --project "MP BDD Chromium"

# Generate and run just the MP login BDD example with the Playwright debug window
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/mp/member-login.feature.spec.js --project "MP BDD Chromium" --debug

# Open the dedicated BDD HTML report
npm run test:bdd:report

# Generate and run the API-first meeting-room seed utility
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/ap/meeting-room-seed-utility.feature.spec.js --project "MP BDD Chromium" --workers=1

# Generate and run the MP booking utility feature
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/mp/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Generate and run the AP booking utility feature
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/ap/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Generate and run the API booking utility feature
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/api/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Run the delete path for one of those tracked rows
NEXUDUS_BDD_BOOKING_ACTION=delete node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/ap/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Or wipe every tracked booking created by the booking utility
npm run test:bdd:bookings:delete-all

```

For BDD booking-utility debug runs, `mp` and `ap` rows are browser-visible, but `api` rows create data directly through the back-office API. The current API utility step is compiled without Playwright's `page` fixture, so it also avoids opening a browser window unnecessarily. If you want to step through a visible booking-creation flow, use an `mp` or `ap` example row rather than `api`.

The standalone booking cleanup command is useful when you want to reset every tracked booking created by earlier utility runs in one shot. It reads [booking-utility-state.json](../playwright/.cache/booking-utility-state.json), cancels each stored id through the back-office API, removes deleted or already-missing ids from the cache, and clears the legacy `playwright/.cache/mp-booking-utility-state.json` file too.

The current booking-utility layout is split by surface under `tests/bdd/features/mp`, `tests/bdd/features/ap`, and `tests/bdd/features/api` rather than mixing all modes into a single feature file.

## Extending the proof of concept

- add a new `.feature` file under `tests/bdd/features`
- add matching step definitions under `tests/bdd/steps`
- keep the step definitions thin and reuse existing page objects from `page-objects/mp`
- rerun `npm run test:bdd`
