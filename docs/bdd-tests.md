# BDD tests

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [Testing utilities](testing-utilities.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

The repo includes a small `playwright-bdd` proof of concept that sits alongside the existing `@playwright/test` suite rather than replacing it. It lives under [tests/bdd](../tests/bdd), uses its own config in [playwright.bdd.config.ts](../playwright.bdd.config.ts), and currently covers two public MP documentation flows:

- hero sign-in from the public home page reaches `/login`
- footer `FAQ` from the public home page reaches `/faq`

The generated Playwright specs are written to `tests/bdd/.features-gen/` and are ignored by git. That same generated-spec path is also how the opt-in utility features are run locally, including the AP meeting-room seed utility.

For BDD-driven utilities that are meant to support manual testing rather than normal CI assertions, see [Testing utilities](testing-utilities.md). The main current example is the add-only AP meeting-room seed utility plus its standalone cleanup script.

## Example Gherkin

```gherkin
@bdd @mp @public
Feature: MP public home hero sign in
  As an anonymous visitor
  I want the hero sign-in link to reach the login form
  So that I can start signing into the member portal

  Scenario: public home hero sign-in reaches login
    Given I am on the public member portal home page
    When I open the hero sign-in link
    Then I should reach the anonymous login page
```

## Example usage

```bash
# Generate the Playwright specs from the feature files
npm run test:bdd:gen

# Generate and run the BDD examples
npm run test:bdd

# Generate and run the BDD examples in headed mode
npm run test:bdd:headed

# Open the dedicated BDD HTML report
npm run test:bdd:report

# Generate and run the AP meeting-room seed utility
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/ap/meeting-room-seed-utility.feature.spec.js --project "MP BDD Chromium" --workers=1
```

## Extending the proof of concept

- add a new `.feature` file under `tests/bdd/features`
- add matching step definitions under `tests/bdd/steps`
- keep the step definitions thin and reuse existing page objects from `page-objects/mp`
- rerun `npm run test:bdd`
