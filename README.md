# playwright-nexudus-sh

End-to-end Playwright test suite for the Nexudus Admin Panel (AP) dashboard and Nexudus Member Portal (MP).

This project is written in TypeScript, uses `@playwright/test` as the test runner, and follows a small page object model structure to keep test flows readable.

## What the suite covers

### AP

- AP login shows a clear error message when invalid credentials are provided
- AP login succeeds with the configured AP credentials
- Admin overview sections render expected capability groupings
- A flower arranging course can be created in AP
- A product can be created and then removed from the products area
- A delivery can be registered, assigned to a user, uploaded with a PDF label, and then removed
- A delivery can be signed for on collection and marked as collected
- An `Astronomy Night` event can be created for the following Saturday

### MP

- MP staging member-portal login succeeds with the configured MP credentials

## Project structure

```text
.
|-- .github/workflows/playwright.yml
|-- docs/
|-- helpers.ts
|-- page-objects/
|   |-- ap/
|   |   |-- AdminPanelPage.ts
|   |   |-- APLoginPage.ts
|   |   |-- CoursePage.ts
|   |   |-- DeliveryPage.ts
|   |   `-- ProductPage.ts
|   |-- mp/
|   |   `-- MPLoginPage.ts
|   `-- shared/
|       `-- AbstractPage.ts
|-- playwright.config.ts
|-- tests/
|   |-- ap/
|   |   |-- ap-login.spec.ts
|   |   |-- course-workflows.spec.ts
|   |   |-- admin-panel-overview.spec.ts
|   |   `-- admin-panel-workflows.spec.ts
|   |-- fixtures/
|   |   |-- collection-signature.png
|   |   `-- delivery-label.pdf
|   `-- mp/
|       `-- mp-login.spec.ts
`-- playwright-report-example/
```

## Prerequisites

- Node.js 18 or newer
- npm

## Installation

```bash
git clone https://github.com/hobbs9090/playwright-nexudus-sh.git
cd playwright-nexudus-sh
npm ci
npx playwright install chromium
```

## Development setup

If you want to extend the suite, the usual local setup is:

```bash
git clone https://github.com/hobbs9090/playwright-nexudus-sh.git
cd playwright-nexudus-sh
npm ci
npx playwright install chromium
cp .env.example .env
```

Then add your local AP and MP credentials to `.env`. The repo already loads `.env.shared` first and `.env` second, so team defaults remain available while your local secrets override them.

The usual editing setup for this repo is Visual Studio Code with the Codex extension, which works well for creating or extending Playwright tests while staying inside the existing project structure.

If anyone on the team wants help getting set up or adding new tests, I’d be very happy to help.

When adding tests, follow the existing split:

- Put Admin Panel specs in `tests/ap` and page objects in `page-objects/ap`
- Put Member Portal specs in `tests/mp` and page objects in `page-objects/mp`
- Keep shared browser helpers in `page-objects/shared`

An effective way to work with Codex is to be explicit about the target area, data to use, and how the new flow should be verified. For example:

```text
Create a new AP Playwright test that adds a booking for next Tuesday at 10:00 AM.
Use the existing AP page object pattern, put the spec under tests/ap, add any new page-object methods under page-objects/ap, reuse shared config where possible, run the new test locally, and update the README if new configuration is needed.
```

## Configuration

The suite supports the following environment variables:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXUDUS_AP_BASE_URL` | No | `https://dashboard-staging.nexudus.com/` | Base URL for the AP project |
| `NEXUDUS_AP_EMAIL` | Yes | None | Username for the AP project |
| `NEXUDUS_AP_PASSWORD` | Yes | None | Password for the AP project |
| `NEXUDUS_AP_MEMBER_NAME` | Yes for AP delivery workflows | `Felicity Ward` via `.env.shared` | Member name used by AP delivery workflow tests |
| `NEXUDUS_AP_RECEIVED_BY_NAME` | Yes for AP delivery workflows | `Steven Hobbs` via `.env.shared` | AP user name expected in the delivery `Received by` field |
| `NEXUDUS_AP_COURSE_HOST_NAME` | Yes for AP course workflows | `Jane Appleby` via `.env.shared` | Host name selected when creating AP courses |
| `CRUD_APPEND_RANDOM_SEED` | No | `true` via `.env.shared` | Appends the shared CRUD random seed to created course, product, and event names |
| `NEXUDUS_AP_EVENT_NAME` | No | `Astronomy Night` via `.env.shared` | Base name used when generating AP event titles |
| `NEXUDUS_CONTRIBUTOR_INITIALS` | No | Derived from Git user name when available | Prefix applied to the CRUD random seed, for example `shabcde` |
| `NEXUDUS_MP_BASE_URL` | No | `https://coworkingnetworksteven.spacesstaging.nexudus.com/` | Base URL for the MP staging project |
| `NEXUDUS_MP_EMAIL` | Yes | None | Username for the MP staging project |
| `NEXUDUS_MP_PASSWORD` | Yes | None | Password for the MP staging project |
| `PLAYWRIGHT_HEADLESS` | No | `false` locally, `true` on CI | Forces headless browser execution |

The suite currently runs AP admin coverage on the AP dashboard and MP login coverage on the MP staging dashboard. It fails fast if the credential pair required for the selected project is missing.

The repo root `.env.shared` and `.env` files are loaded automatically by the npm scripts in this repository. `.env.shared` is intended for tracked team-wide non-sensitive defaults, while `.env` is intended for local secrets and machine-specific overrides. A tracked template is available in `.env.example`, while `.env` itself is ignored by git.

Example local setup:

```bash
NEXUDUS_AP_EMAIL='your-ap-user@example.com'
NEXUDUS_AP_PASSWORD='your-ap-password'
NEXUDUS_MP_EMAIL='your-mp-staging-user@example.com'
NEXUDUS_MP_PASSWORD='your-mp-staging-password'
NEXUDUS_AP_BASE_URL='https://dashboard-staging.nexudus.com/'
NEXUDUS_MP_BASE_URL='https://coworkingnetworksteven.spacesstaging.nexudus.com/'
```

The committed [.env.shared](/Users/steven/Source/Playwright/playwright-nexudus-sh/.env.shared) currently provides:

- `NEXUDUS_AP_MEMBER_NAME=Felicity Ward`
- `NEXUDUS_AP_RECEIVED_BY_NAME=Steven Hobbs`
- `NEXUDUS_AP_COURSE_HOST_NAME=Jane Appleby`
- `CRUD_APPEND_RANDOM_SEED=true`
- `NEXUDUS_AP_EVENT_NAME=Astronomy Night`

Load order is:

- `.env.shared` first
- `.env` second

That means local `.env` values can override shared defaults when needed. The same load order is used for both the Playwright commands and the local k6 commands in `package.json`.

For CRUD-style create flows, the suite builds names from a base label plus a shared random seed. This applies to AP products, AP courses, and AP events. When `CRUD_APPEND_RANDOM_SEED=true`, the test appends a seed in the form `ddmm hhmm <initials><random>`. `ddmm` is the current day and month, `hhmm` is the current 24-hour time, `<initials>` comes from the contributor when available, and `<random>` is a five-letter lowercase string. For example, `Astronomy Night 1803 1430 shabcde`. Set `CRUD_APPEND_RANDOM_SEED=false` to use the base names exactly as provided.

Contributor initials are resolved in this order:

- `NEXUDUS_CONTRIBUTOR_INITIALS` from your local `.env`, if set
- `GIT_AUTHOR_NAME` / `GIT_COMMITTER_NAME`, if present
- `git config user.name`, if available

If initials cannot be resolved, the CRUD flows still get the standard random seed without initials.

## Running the tests

```bash
# Run the suite
npm test

# Run in headed mode
npm run test:headed

# Run only the delivery workflow tagged with @3093
npx playwright test -g @3093

# Run only the delivery workflow tagged with @3093 in headed mode
npx playwright test --headed -g @3093

# Open the latest HTML report
npm run test:report
```

By default the suite runs two Chromium projects: `AP Chromium` and `MP Staging Chromium`. `AP Chromium` includes the admin overview, admin workflow, AP login, and AP course-creation specs against the dashboard application. `MP Staging Chromium` currently runs only the MP member-portal login spec against the spaces staging application. If you only want one target, use Playwright's project filter, for example `npx playwright test --project "MP Staging Chromium"`.

The environment split is explicit in code:

- AP-specific page objects live in [page-objects/ap](/Users/steven/Source/Playwright/playwright-nexudus-sh/page-objects/ap), while MP-specific page objects live in [page-objects/mp](/Users/steven/Source/Playwright/playwright-nexudus-sh/page-objects/mp).
- Shared low-level behavior stays in [AbstractPage.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/page-objects/shared/AbstractPage.ts).

### AP tests

- [ap-login.spec.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/ap/ap-login.spec.ts) covers invalid and valid AP login
- [admin-panel-overview.spec.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/ap/admin-panel-overview.spec.ts) checks the main AP sections and capability groups
- [admin-panel-workflows.spec.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/ap/admin-panel-workflows.spec.ts) covers members, bookings, invoices, events, help-desk, deliveries, products, and event creation
- [course-workflows.spec.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/ap/course-workflows.spec.ts) covers AP course creation

### MP tests

- [mp-login.spec.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/mp/mp-login.spec.ts) opens the member-portal `/login` page and verifies the authenticated dashboard

## Running the k6 performance smoke test

This repository also includes a small k6 smoke test for the public Nexudus landing page and its primary static assets.

These k6 checks are intended for local execution only and are not run in GitHub Actions.

Prerequisite:

- Install the `k6` CLI locally from https://grafana.com/docs/k6/latest/set-up/install-k6/

Example usage:

```bash
# Run the default smoke test against the standard Nexudus dashboard URL
npm run perf:smoke

# Override the target URL or load profile
NEXUDUS_AP_BASE_URL='https://dashboard-staging.nexudus.com' K6_VUS=10 K6_DURATION=45s npm run perf:smoke
```

The test uses these environment variables:

- `NEXUDUS_AP_BASE_URL` to choose the target host
- `K6_VUS` to set the number of virtual users, default `5`
- `K6_DURATION` to set the test duration, default `30s`

## Running the k6 authenticated login smoke test

There is also a browser-based k6 smoke test for the authenticated admin-panel login flow.

This k6 login check is local-only and is not run in GitHub Actions.

It uses the same credentials as the Playwright suite:

- `NEXUDUS_AP_EMAIL`
- `NEXUDUS_AP_PASSWORD`
- Optional `NEXUDUS_AP_BASE_URL`

Example usage:

```bash
# Run a single authenticated login check
npm run perf:login

# Override the browser scenario profile
K6_LOGIN_VUS=1 K6_LOGIN_ITERATIONS=3 K6_LOGIN_MAX_DURATION=3m npm run perf:login
```

The login test uses a browser scenario, so it is intentionally lightweight by default. It verifies that valid credentials reach `/dashboards/now` and that the Dashboard navigation link becomes visible after sign-in.

## Reports and artifacts

- HTML report output: `playwright-report/`
- Test artifacts such as screenshots, videos, and traces: `test-results/`
- A checked-in sample report is available in `playwright-report-example/`

## GitHub Actions

The repository includes a workflow at [.github/workflows/playwright.yml](.github/workflows/playwright.yml) that runs the suite on:

- pushes to `main`
- pull requests
- manual dispatches

To use the workflow, configure these GitHub settings:

- Repository secret: `NEXUDUS_AP_EMAIL`
- Repository secret: `NEXUDUS_AP_PASSWORD`
- Repository secret: `NEXUDUS_MP_EMAIL`
- Repository secret: `NEXUDUS_MP_PASSWORD`
- Optional repository variable: `NEXUDUS_AP_BASE_URL`
- Optional repository variable: `NEXUDUS_MP_BASE_URL`

The workflow installs dependencies, installs the Playwright Chromium browser, and runs the full Playwright AP and MP suite in GitHub Actions. It then merges the Playwright blob output into a single HTML report and a single JUnit result file, then uploads both `playwright-report` and `test-results` as artifacts.

Each workflow run also adds a Playwright summary directly to the GitHub Actions interface. On pushes to `main`, the workflow automatically publishes the HTML report to GitHub Pages so it can be opened in the browser without downloading the artifact first.

The `k6` smoke tests are local-only and are not executed by the GitHub Actions workflow.

To use the published HTML report, enable GitHub Pages for the repository and select GitHub Actions as the source.

## Notes

- The suite is intentionally small and focused on demonstrating Playwright structure and workflow integration.
- The product creation flow currently depends on UI timing and may require maintenance if the Nexudus product screens change.
