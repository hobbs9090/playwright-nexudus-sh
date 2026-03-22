# Running tests

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

## Running the tests

```bash
# Run the suite
npm test

# Run the opt-in gremlins exploratory pack
npm run test:gremlins

# Run only the API project
npm run test:api

# Run the MP mobile-view smoke checks in Android Chrome
npx playwright test --project "MP Android Chrome"

# Run the MP mobile-view smoke checks in iPhone Safari
npx playwright test --project "MP iPhone Safari"

# Run in headed mode
npm run test:headed

# Run the gremlins pack in headed mode
npm run test:gremlins:headed

# Run only the delivery workflow tagged with @3093
npx playwright test -g @3093

# Run only the delivery workflow tagged with @3093 in headed mode
npx playwright test --headed -g @3093

# Open the latest HTML report
npm run test:report
```

By default the suite runs three projects: `AP Chromium`, `MP Staging Chromium`, and `API`. `AP Chromium` includes the admin overview, admin workflow, AP login, and AP course-creation specs against the dashboard application. `MP Staging Chromium` covers the member-portal login flow, resource-booking coverage, public signup coverage, signed-in help-request coverage, public request-a-tour coverage, and public home-content checks against the spaces staging application. `API` uses the configured MP host origin by default, authenticates against `/api/token`, and runs API-only coverage under [tests/api](../tests/api), including business-setting mutation checks and MP footer verification. If you only want one target, use Playwright's project filter, for example `npx playwright test --project "API"`.

The repo also includes two opt-in MP mobile browser projects:

- `MP Android Chrome` uses Playwright's `Pixel 5` device profile with Chromium to exercise MP flows in an Android Chrome-style mobile view
- `MP iPhone Safari` uses Playwright's `iPhone 12` device profile with WebKit to exercise MP flows in an iPhone Safari-style mobile view

These projects are intended for responsive browser coverage of the member portal. They are useful for checking layout, navigation, and core journeys in mobile-sized Chrome and Safari browser contexts without changing the default desktop-first suite.

The environment split is explicit in code:

- AP-specific page objects live in [page-objects/ap](../page-objects/ap), while MP-specific page objects live in [page-objects/mp](../page-objects/mp)
- Shared low-level behavior stays in [AbstractPage.ts](../page-objects/shared/AbstractPage.ts)

## Mobile views and native-device testing

If you want mobile confidence in this repo, the most practical approach is to treat mobile browser coverage and native-device coverage as two related but different layers.

- Start with the included Playwright mobile browser projects for MP flows that matter on phones, such as the public home page, hero sign-in, FAQ, and authenticated login
- `MP Android Chrome` is the Android-facing mobile browser project and `MP iPhone Safari` is the iOS-facing mobile browser project. They give us responsive browser coverage for Chrome- and Safari-style mobile views inside Playwright
- Keep the default suite desktop-first unless there is a clear product reason to run mobile browser coverage on every commit
- Prefer opt-in mobile projects instead of mixing phone coverage into the existing AP, MP, and API defaults
- Focus AP mobile checks on responsive sanity only, because the AP dashboard is primarily a desktop workflow
- Reuse the existing MP page objects where possible, but keep mobile assertions looser and centered on visible outcomes rather than brittle layout details

These mobile Playwright projects are still browser tests. They help us validate MP in mobile-sized Chrome and Safari contexts, but they do not replace true native-device testing.

- Use real iOS and Android devices, or a device cloud, when a change depends on true mobile browser behavior such as iOS Safari quirks, Android Chrome keyboard/input behavior, touch handling, camera access, file uploads, permissions, or install-to-home-screen behavior
- If the product also ships as a native mobile app, keep Playwright for web and mobile-web coverage and add a separate native automation layer for app-specific behavior. Reuse the business scenarios and test data, but do not try to reuse raw web selectors directly in native tests

In practice, a good first step is a small MP mobile smoke pack that checks the public home page, hero sign-in, footer FAQ, and authenticated login journey in both `MP Android Chrome` and `MP iPhone Safari`, then expand device coverage only where the extra signal is worth it.

## Related guides

- [BDD tests](bdd-tests.md): `playwright-bdd` proof-of-concept setup, commands, example Gherkin, and extension guidance
- [Testing utilities](testing-utilities.md): booking utility flows that use BDD rows to add or delete manual test data

## Gremlins exploratory testing

The repo includes a small opt-in `gremlins.js` layer for exploratory MP robustness checks. This sits alongside the deterministic `@playwright/test` suite and does not run as part of `npm test`.

The gremlins coverage lives under [tests/gremlins](../tests/gremlins), uses its own config in [playwright.gremlins.config.ts](../playwright.gremlins.config.ts), and injects `node_modules/gremlins.js/dist/gremlins.min.js` with `page.addInitScript(...)` before starting each horde.

The first safe targets are:

- MP public home page
- MP public FAQ page
- MP authenticated language settings page

The helper in [tests/gremlins/support/gremlins.ts](../tests/gremlins/support/gremlins.ts) keeps the default horde conservative and reproducible:

- prints the chosen seed so a failure can be replayed
- defaults to a small action count and pace
- captures browser `console.error`, uncaught page errors, crashes, and meaningful same-origin request failures
- fails if the page becomes unusable after the attack

Example usage:

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

These tests are intentionally opt-in because they are exploratory rather than deterministic product assertions. They are useful for finding client-side brittleness, but they should not replace the normal AP, MP, API, Lighthouse, or BDD coverage.

For the current authenticated MP target, the helper ignores the specific OneSignal native-push unsupported-environment error that Playwright can trigger during exploratory runs. That keeps the signal focused on portal survivability rather than browser-push support.

Do not target the following with gremlins in this repo:

- AP create, update, or delete workflows
- payment, checkout, or invoice collection paths
- account/profile mutation forms unless the test is purpose-built to isolate them
- notification opt-in or other browser-permission flows

## Current test inventory

### AP tests

- [ap-login.spec.ts](../tests/ap/ap-login.spec.ts) covers invalid and valid AP login
- [admin-panel-overview.spec.ts](../tests/ap/admin-panel-overview.spec.ts) checks the main AP sections and capability groups
- [admin-panel-workflows.spec.ts](../tests/ap/admin-panel-workflows.spec.ts) covers members, bookings, invoices, events, help-desk, deliveries, products, and event creation
- [course-workflows.spec.ts](../tests/ap/course-workflows.spec.ts) creates a public AP course titled `Six million four hundred and fifty-three thousand five hundred and sixty-eight Hundreds and Thousands: A History of Cake Decorations` with a random seed, three sections, eight lessons, uploaded large and small fixture images, discussion-board setup, home-page featuring, and three randomly enrolled participants

### MP tests

- [mp-login.spec.ts](../tests/mp/mp-login.spec.ts) opens the member-portal `/login` page and verifies the authenticated dashboard
- [mp-bookings.spec.ts](../tests/mp/mp-bookings.spec.ts) signs into MP, creates a one-off two-hour booking for `Large Meeting Room #1`, verifies it completed, and cancels it again through the MP booking API
- [mp-signup.spec.ts](../tests/mp/mp-signup.spec.ts) creates new public MP accounts for both individual and company journeys
- [mp-help-requests.spec.ts](../tests/mp/mp-help-requests.spec.ts) signs into MP, opens the support area, creates a help request, and verifies it appears in the member's request list
- [mp-home-content.spec.ts](../tests/mp/mp-home-content.spec.ts) verifies the configured public footer branding, plans, add-ons, featured articles, and locations on the MP home page
- [mp-tour.spec.ts](../tests/mp/mp-tour.spec.ts) opens the public `request a tour` journey from the MP login page, submits a uniquely seeded request, and verifies the completion screen

### API tests

- [business-settings.spec.ts](../tests/api/business-settings.spec.ts) authenticates against the Nexudus API, updates `Footer.SayingText` and verifies it in MP, and updates plus restores `Calendars.DefaultView` for the current business
- [user-info.spec.ts](../tests/api/user-info.spec.ts) authenticates against the Nexudus API and verifies that the current user profile can be read from `/en/user/me`

Note: the `Footer.SayingText` test intentionally leaves the updated footer saying in place so the API mutation can be demonstrated in MP as well. This is for demo purposes only; in a stricter production suite, shared business settings would usually be restored after verification.
