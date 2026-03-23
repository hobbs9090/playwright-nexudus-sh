# Getting started

[Repository README](../README.md) | [Docs index](README.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

## Coverage overview

### AP

- AP login shows a clear error message when invalid credentials are provided
- AP login succeeds with the configured AP credentials
- Admin overview sections render expected capability groupings
- A public cake-decoration history course can be created in AP with seeded titles and image upload in the UI, then falls back to the API for some setup steps such as sections, lessons, richer configuration, discussion-board creation, home-page featuring, and random participant enrolment
- A product can be created and then removed from the products area
- A delivery can be registered, assigned to a user, uploaded with a PDF label, and then removed
- A delivery can be signed for on collection and marked as collected
- An `Astronomy Night` event can be created for the following Saturday

### MP

- MP staging member-portal login succeeds with the configured MP credentials
- MP mobile browser coverage exercises key member-portal journeys in Android Chrome-style and iPhone Safari-style viewports
- MP staging account creation succeeds for new individual accounts
- MP staging account creation succeeds for new company accounts
- MP signed-in members can create help requests from the support area
- MP public footer renders the configured business branding and copyright content
- MP public home page renders the configured plans, add-ons, featured articles, and locations
- MP public visitors can request a tour from the login page

### API

- API authentication returns a bearer token for the configured Nexudus user
- The authenticated API user profile can be retrieved from the Nexudus API
- API business setting `Footer.SayingText` can be updated and verified in MP
- API business setting `Calendars.DefaultView` can be updated and restored for the current business

## Project structure

```text
.
|-- api/
|   `-- NexudusApiClient.ts
|-- .github/workflows/playwright.yml
|-- helpers.ts
|-- page-objects/
|   |-- ap/
|   |   |-- AdminPanelPage.ts
|   |   |-- APLoginPage.ts
|   |   |-- CoursePage.ts
|   |   |-- DeliveryPage.ts
|   |   |-- EventPage.ts
|   |   `-- ProductPage.ts
|   |-- mp/
|   |   |-- MPHelpRequestsPage.ts
|   |   |-- MPHomePage.ts
|   |   |-- MPLoginPage.ts
|   |   |-- MPSignupPage.ts
|   |   `-- MPTourPage.ts
|   `-- shared/
|       `-- AbstractPage.ts
|-- playwright.config.ts
|-- playwright.gremlins.config.ts
|-- playwright.lighthouse.config.ts
|-- scripts/
|   |-- build-lighthouse-report-index.mjs
|   |-- build-pages-report-site.mjs
|   |-- run-with-dotenv.mjs
|   `-- write-github-summary.mjs
|-- tests/
|   |-- ap/
|   |   |-- ap-login.spec.ts
|   |   |-- course-workflows.spec.ts
|   |   |-- admin-panel-overview.spec.ts
|   |   `-- admin-panel-workflows.spec.ts
|   |-- api/
|   |   |-- api-test.ts
|   |   |-- business-settings.spec.ts
|   |   `-- user-info.spec.ts
|   |-- bdd/
|   |   |-- features/
|   |   |   |-- ap/
|   |   |   |   |-- meeting-room-seed-utility.feature
|   |   |   |   `-- member-bookings.feature
|   |   |   |-- api/
|   |   |   |   `-- member-bookings.feature
|   |   |   `-- mp/
|   |   |       |-- member-bookings.feature
|   |   |       `-- member-login.feature
|   |   `-- steps/
|   |       |-- ap/
|   |       |   `-- meeting-room-seed.steps.ts
|   |       |-- mp/
|   |       |   `-- member-login.steps.ts
|   |       `-- utility/
|   |           `-- booking-utility.steps.ts
|   |-- fixtures/
|   |   |-- ap-course-cake-decorations-large.png
|   |   |-- ap-course-cake-decorations-small.png
|   |   |-- collection-signature.png
|   |   `-- delivery-label.pdf
|   |-- gremlins/
|   |   |-- mp-portal.gremlins.spec.ts
|   |   |-- mp-public.gremlins.spec.ts
|   |   `-- support/
|   |       `-- gremlins.ts
|   |-- lighthouse/
|   |   |-- ap/
|   |   |   `-- ap-dashboard-lighthouse.spec.ts
|   |   |-- mp/
|   |   |   `-- mp-dashboard-lighthouse.spec.ts
|   |   `-- support.ts
|   `-- mp/
|       |-- mp-help-requests.spec.ts
|       |-- mp-home-content.spec.ts
|       |-- mp-login.spec.ts
|       |-- mp-signup.spec.ts
|       `-- mp-tour.spec.ts
```

## Development setup

If you are a QA engineer who wants to run, debug, or extend the suite locally, the usual setup is:

```bash
git clone https://github.com/hobbs9090/playwright-nexudus-sh.git
cd playwright-nexudus-sh
npm ci
npx playwright install chromium
cp .env.example .env
```

To get fully up and running, a QA would usually need:

- Git installed locally and access to this repository
- Node.js 24 recommended locally. The repo supports Node.js 18.16 or newer, but matching the CI runtime is usually simpler
- npm
- Playwright Chromium installed with `npx playwright install chromium`
- A local `.env` copied from [`.env.example`](../.env.example)
- Working Nexudus staging credentials for AP and for an MP member or coworker account
- Optional separate API credentials only if the API tests should not reuse the MP credentials

The repo already loads `.env.shared` first and `.env` second, so team defaults remain available while your local secrets override them. In practice that means a new QA will usually only need to add the AP and MP login credentials unless they want to override the shared defaults for delivery, course, event, or API work.

Helpful local tools are:

- Visual Studio Code
- The Codex extension for VS Code if you want AI help creating or extending Playwright tests inside the repo
- GitHub CLI (`gh`) if you want to inspect GitHub Actions runs and logs from the terminal
- `k6` only if you plan to use the optional performance smoke scripts described later in these docs

If anyone on the team wants help getting set up or adding new tests, I’d be very happy to help.
