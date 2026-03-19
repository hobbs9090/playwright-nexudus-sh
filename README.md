# playwright-nexudus-sh

End-to-end Playwright test suite for the Nexudus Admin Panel (AP) dashboard, Nexudus Member Portal (MP), and Nexudus API.

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

### API

- API authentication returns a bearer token for the configured Nexudus user
- The authenticated API user profile can be retrieved from the Nexudus API

## Project structure

```text
.
|-- api/
|   `-- NexudusApiClient.ts
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
|   |   `-- user-info.spec.ts
|   |-- fixtures/
|   |   |-- collection-signature.png
|   |   `-- delivery-label.pdf
|   |-- lighthouse/
|   |   |-- ap/
|   |   |   `-- ap-dashboard-lighthouse.spec.ts
|   |   |-- mp/
|   |   |   `-- mp-dashboard-lighthouse.spec.ts
|   |   `-- support.ts
|   `-- mp/
|       `-- mp-login.spec.ts
`-- playwright-report-example/
```

## Prerequisites

- Node.js 18.16 or newer
- npm

## Installation

```bash
git clone https://github.com/hobbs9090/playwright-nexudus-sh.git
cd playwright-nexudus-sh
npm ci
npx playwright install chromium
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

- Git installed locally and access to this repository.
- Node.js 24 recommended locally. The repo supports Node.js 18.16 or newer, but matching the CI runtime is usually simpler.
- npm.
- Playwright Chromium installed with `npx playwright install chromium`.
- A local `.env` copied from `.env.example`.
- Working Nexudus staging credentials for AP and MP.
- Optional separate API credentials only if the API tests should not reuse the MP credentials.

The repo already loads `.env.shared` first and `.env` second, so team defaults remain available while your local secrets override them. In practice that means a new QA will usually only need to add the AP and MP login credentials unless they want to override the shared defaults for delivery, course, event, or API work.

Helpful local tools are:

- Visual Studio Code.
- The Codex extension for VS Code if you want AI help creating or extending Playwright tests inside the repo.
- GitHub CLI (`gh`) if you want to inspect GitHub Actions runs and logs from the terminal.
- `k6` only if you plan to use the optional performance smoke scripts described later in this README.

If you want to use Codex with this repository:

- Codex is optional. The suite can be run and maintained without it.
- ChatGPT Free or lighter usage tiers can be restrictive for longer Codex sessions, especially when the work involves reading a lot of files, running tests repeatedly, or fixing CI issues.
- A paid plan such as ChatGPT Pro is often more practical for sustained repo work, but plan limits and availability can change over time.
- Even on paid plans, focused prompts help because larger exploratory tasks can consume allowance quickly.

If anyone on the team wants help getting set up or adding new tests, I’d be very happy to help.

## Nexudus documentation

- Knowledge Base: https://help.nexudus.com/
- Developers Hub: https://developers.nexudus.com/reference/getting-started-with-your-api-1

The Developers Hub is the main place to find details about the Nexudus APIs.

The API test infrastructure in this repository uses the public Nexudus API pattern documented there. The initial smoke coverage authenticates with `POST /api/token` and then reads the current user profile from `GET /en/user/me`.

When adding tests, follow the existing split:

- Put Admin Panel specs in `tests/ap` and page objects in `page-objects/ap`
- Put Member Portal specs in `tests/mp` and page objects in `page-objects/mp`
- Put API specs in `tests/api` and API client helpers in `api`
- Keep shared browser helpers in `page-objects/shared`

An effective way to work with Codex is to be explicit about the target area, data to use, and how the new flow should be verified. For example:

```text
Create a new AP Playwright test that adds a booking for next Tuesday at 10:00 AM.
Use the existing AP page object pattern, put the spec under tests/ap,
add any new page-object methods under page-objects/ap, reuse shared config
where possible, run the new test locally, and update the README if new
configuration is needed.
```

I have not tried that exact example above, but in practice Codex should usually be able to work across the site, add the necessary page objects, run the tests locally, fix issues, and rerun until things pass before anything goes up to CI, including in parts of AP or MP it has not previously visited. In practice it is not always quite that simple, but it does seem to be getting better.

## Configuration

The suite supports the following environment variables:

| Variable                        | Required                      | Default                                                     | Purpose                                                                         |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXUDUS_AP_BASE_URL`           | No                            | `https://dashboard-staging.nexudus.com/`                    | Base URL for the AP project                                                     |
| `NEXUDUS_AP_EMAIL`              | Yes                           | None                                                        | Username for the AP project                                                     |
| `NEXUDUS_AP_PASSWORD`           | Yes                           | None                                                        | Password for the AP project                                                     |
| `NEXUDUS_AP_MEMBER_NAME`        | Yes for AP delivery workflows | `Felicity Ward` via `.env.shared`                           | Member name used by AP delivery workflow tests                                  |
| `NEXUDUS_AP_RECEIVED_BY_NAME`   | Yes for AP delivery workflows | `Steven Hobbs` via `.env.shared`                            | AP user name expected in the delivery `Received by` field                       |
| `NEXUDUS_AP_COURSE_HOST_NAME`   | Yes for AP course workflows   | `Jane Appleby` via `.env.shared`                            | Host name selected when creating AP courses                                     |
| `CRUD_APPEND_RANDOM_SEED`       | No                            | `true` via `.env.shared`                                    | Appends the shared CRUD random seed to created course, product, and event names |
| `NEXUDUS_AP_EVENT_NAME`         | No                            | `Astronomy Night` via `.env.shared`                         | Base name used when generating AP event titles                                  |
| `NEXUDUS_CONTRIBUTOR_INITIALS`  | No                            | Derived from Git user name when available                   | Prefix applied to the CRUD random seed, for example `shabcde`                   |
| `NEXUDUS_MP_BASE_URL`           | No                            | `https://coworkingnetworksteven.spacesstaging.nexudus.com/` | Base URL for the MP staging project                                             |
| `NEXUDUS_MP_EMAIL`              | Yes                           | None                                                        | Username for the MP staging project                                             |
| `NEXUDUS_MP_PASSWORD`           | Yes                           | None                                                        | Password for the MP staging project                                             |
| `NEXUDUS_API_BASE_URL`          | No                            | Derived from `NEXUDUS_MP_BASE_URL` origin                   | Base URL for API tests, for example `https://your-space.spacesstaging.nexudus.com` |
| `NEXUDUS_API_USERNAME`          | No                            | `NEXUDUS_MP_EMAIL`, then `NEXUDUS_AP_EMAIL`                | Optional username override for API authentication                               |
| `NEXUDUS_API_PASSWORD`          | No                            | `NEXUDUS_MP_PASSWORD`, then `NEXUDUS_AP_PASSWORD`          | Optional password override for API authentication                               |
| `PLAYWRIGHT_HEADLESS`           | No                            | `false` locally, `true` on CI                               | Forces headless browser execution                                               |
| `LIGHTHOUSE_MIN_PERFORMANCE`    | No                            | `35`                                                        | Minimum Lighthouse performance score for the AP and MP dashboard audits         |
| `LIGHTHOUSE_MIN_ACCESSIBILITY`  | No                            | `60`                                                        | Minimum Lighthouse accessibility score for the AP and MP dashboard audits       |
| `LIGHTHOUSE_MIN_BEST_PRACTICES` | No                            | `50`                                                        | Minimum Lighthouse best-practices score for the AP and MP dashboard audits      |

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
NEXUDUS_API_BASE_URL='https://coworkingnetworksteven.spacesstaging.nexudus.com/'
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

# Run only the API project
npm run test:api

# Run in headed mode
npm run test:headed

# Run only the delivery workflow tagged with @3093
npx playwright test -g @3093

# Run only the delivery workflow tagged with @3093 in headed mode
npx playwright test --headed -g @3093

# Open the latest HTML report
npm run test:report
```

By default the suite runs three projects: `AP Chromium`, `MP Staging Chromium`, and `API`. `AP Chromium` includes the admin overview, admin workflow, AP login, and AP course-creation specs against the dashboard application. `MP Staging Chromium` currently runs only the MP member-portal login spec against the spaces staging application. `API` uses the configured MP host origin by default, authenticates against `/api/token`, and runs API-only coverage under `tests/api`. If you only want one target, use Playwright's project filter, for example `npx playwright test --project "API"`.

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

### API tests

- [user-info.spec.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/api/user-info.spec.ts) authenticates against the Nexudus API and verifies that the current user profile can be read from `/en/user/me`

## Running the Lighthouse audits

The repository also includes authenticated Lighthouse checks for both AP and MP. These audits run through [playwright.lighthouse.config.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/playwright.lighthouse.config.ts) so the regular functional suite stays focused on end-to-end behavior while Lighthouse keeps its own config, retries, thresholds, and report output.

For the underlying audit model, categories, and scoring guidance, see the official Lighthouse documentation from Chrome for Developers: <https://developer.chrome.com/docs/lighthouse/>.

The Lighthouse specs live in [tests/lighthouse](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/lighthouse):

- [ap-dashboard-lighthouse.spec.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/lighthouse/ap/ap-dashboard-lighthouse.spec.ts) signs into AP and audits the authenticated dashboard
- [mp-dashboard-lighthouse.spec.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/lighthouse/mp/mp-dashboard-lighthouse.spec.ts) signs into MP and audits the authenticated dashboard
- [support.ts](/Users/steven/Source/Playwright/playwright-nexudus-sh/tests/lighthouse/support.ts) manages the persistent Chromium context, authenticated audit flow, report generation, and threshold checks

The Lighthouse audits can be run locally, and they also run in CI as the `Run Lighthouse audits` job inside the normal Playwright workflow.

Example usage:

```bash
# Run both authenticated Lighthouse audits
npm run test:lighthouse

# Run only the AP or MP audit
npm run test:lighthouse:ap
npm run test:lighthouse:mp

# Build the native Lighthouse HTML bundle
npm run test:lighthouse:report

# Open the dedicated Playwright wrapper report for the Lighthouse suite
npm run test:lighthouse:playwright-report
```

The Lighthouse suite signs into the authenticated dashboard for each target, runs a desktop Lighthouse audit, and writes JSON plus HTML Lighthouse reports under `test-results/lighthouse/`. `npm run test:lighthouse:report` then builds a browsable native Lighthouse report bundle under `lighthouse-report/`.

Local Lighthouse runs use the repo defaults of:

- `LIGHTHOUSE_MIN_PERFORMANCE=35`
- `LIGHTHOUSE_MIN_ACCESSIBILITY=60`
- `LIGHTHOUSE_MIN_BEST_PRACTICES=50`

In GitHub Actions, the workflow overrides `LIGHTHOUSE_MIN_PERFORMANCE=25` to account for lower and noisier performance scores on GitHub-hosted runners. The Lighthouse helper also compares the rounded category scores that appear in the HTML report, which avoids failing CI on floating-point values such as `24.999999999999996`.

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

- Playwright HTML report output: `playwright-report/`
- Playwright raw result output: `test-results/`
- Native Lighthouse HTML bundle output: `lighthouse-report/`
- Lighthouse JSON and HTML audit output: `test-results/lighthouse/`
- Combined Pages bundle output: `pages-report/`
- A checked-in sample report is available in `playwright-report-example/`

## GitHub Actions

The repository includes a workflow at [.github/workflows/playwright.yml](.github/workflows/playwright.yml) that runs the normal Playwright suite and the Lighthouse suite on:

- pushes to branches
- pull requests
- manual dispatches

To use the workflow, configure these GitHub settings:

- Repository secret: `NEXUDUS_AP_EMAIL`
- Repository secret: `NEXUDUS_AP_PASSWORD`
- Repository secret: `NEXUDUS_MP_EMAIL`
- Repository secret: `NEXUDUS_MP_PASSWORD`
- Optional repository variable: `NEXUDUS_AP_BASE_URL`
- Optional repository variable: `NEXUDUS_MP_BASE_URL`
- Optional repository variable: `NEXUDUS_API_BASE_URL`
- Optional repository secret: `NEXUDUS_API_USERNAME`
- Optional repository secret: `NEXUDUS_API_PASSWORD`
- GitHub Pages configured to deploy from GitHub Actions
- If the `github-pages` environment has deployment branch rules, allow the branch that should publish reports, usually `main`

The workflow installs dependencies, installs the Playwright Chromium browser, and runs four CI jobs:

- `Run Playwright tests` runs the AP, MP, and API Playwright projects and uploads a blob report
- `Merge Playwright reports` merges the blob report into the Playwright HTML and JUnit outputs, uploads the merged report, and writes a GitHub job summary
- `Run Lighthouse audits` runs the authenticated AP and MP Lighthouse specs, uploads the native Lighthouse HTML bundle, and uploads the raw Lighthouse result artifacts
- `Publish CI reports` publishes a combined GitHub Pages site that includes both report types on non-PR pushes and manual runs

If the optional API CI variables are not set, the API project falls back to the MP staging host origin and MP credentials that are already configured for the main Playwright run.

On non-PR pushes and manual runs, the published GitHub Pages site includes:

- the merged Playwright HTML report at `/playwright/`
- the native Lighthouse HTML bundle at `/lighthouse/`
- an index page linking to both reports

The `k6` smoke tests are local-only and are not executed by the GitHub Actions workflow.

## Notes

- This project should be judged more on the quality of the implementation than the breadth of coverage, because it is intended as a proof of concept for AI-enabled automation test development.
- The suite is intentionally small and focused on demonstrating Playwright structure and workflow integration.
- The product creation flow currently depends on UI timing and may require maintenance if the Nexudus product screens change.
