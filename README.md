# playwright-nexudus-sh

End-to-end Playwright test suite for the Nexudus dashboard.

This project is written in TypeScript, uses `@playwright/test` as the test runner, and follows a small page object model structure to keep test flows readable.

## What the suite covers

- Invalid login shows a clear error message
- Valid login reaches the dashboard
- A product can be created and then removed from the products area
- A delivery can be registered, assigned to a user, uploaded with a PDF label, and then removed
- A delivery can be signed for on collection and marked as collected

## Project structure

```text
.
|-- .circleci/config.yml
|-- .github/workflows/playwright.yml
|-- docs/
|-- helpers.ts
|-- page-objects/
|   |-- AbstractPage.ts
|   |-- AdminPanelPage.ts
|   |-- DeliveryPage.ts
|   |-- LoginPage.ts
|   `-- ProductPage.ts
|-- playwright.config.ts
|-- tests/
|   |-- admin-panel-overview.spec.ts
|   |-- admin-panel-workflows.spec.ts
|   |-- fixtures/
|   |   |-- collection-signature.png
|   |   `-- delivery-label.pdf
|   `-- nexudus.spec.ts
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

## Configuration

The suite supports the following environment variables:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXUDUS_BASE_URL` | No | `https://dashboard.nexudus.com/` | Base URL used by Playwright navigation |
| `NEXUDUS_EMAIL` | Yes | None | Username for the valid login flow |
| `NEXUDUS_PASSWORD` | Yes | None | Password for the valid login flow |
| `PLAYWRIGHT_HEADLESS` | No | `false` locally, `true` on CI | Forces headless browser execution |

The suite now fails fast if `NEXUDUS_EMAIL` or `NEXUDUS_PASSWORD` is missing.

The repo root `.env` file is loaded automatically by the npm scripts in this repository. A tracked template is available in `.env.example`, while `.env` itself is ignored by git.

Example local setup:

```bash
NEXUDUS_EMAIL='your-test-user@example.com'
NEXUDUS_PASSWORD='your-test-password'
```

That same `.env` file is used for both the Playwright commands and the k6 commands in `package.json`.

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

By default the active browser project is Chromium. Other browser projects are still present in [playwright.config.ts](playwright.config.ts) but commented out.

## Running the k6 performance smoke test

This repository also includes a small k6 smoke test for the public Nexudus landing page and its primary static assets.

Prerequisite:

- Install the `k6` CLI locally from https://grafana.com/docs/k6/latest/set-up/install-k6/

Example usage:

```bash
# Run the default smoke test against the standard Nexudus dashboard URL
npm run perf:smoke

# Override the target URL or load profile
NEXUDUS_BASE_URL='https://dashboard.nexudus.com' K6_VUS=10 K6_DURATION=45s npm run perf:smoke
```

The test uses these environment variables:

- `NEXUDUS_BASE_URL` to choose the target host
- `K6_VUS` to set the number of virtual users, default `5`
- `K6_DURATION` to set the test duration, default `30s`

## Running the k6 authenticated login smoke test

There is also a browser-based k6 smoke test for the authenticated admin-panel login flow.

It uses the same credentials as the Playwright suite:

- `NEXUDUS_EMAIL`
- `NEXUDUS_PASSWORD`
- Optional `NEXUDUS_BASE_URL`

Example usage:

```bash
# Run a single authenticated login check
npm run perf:login

# Override the browser scenario profile
K6_LOGIN_VUS=1 K6_LOGIN_ITERATIONS=3 K6_LOGIN_MAX_DURATION=3m npm run perf:login
```

The login test uses a browser scenario, so it is intentionally lightweight by default. It verifies that valid credentials reach `/dashboards/now` and that the Dashboard navigation link becomes visible after sign-in.

## Security

The repository no longer contains fallback Nexudus credentials in code. If you are remediating an older clone or fork, follow the checklist in [docs/security-remediation-checklist.md](docs/security-remediation-checklist.md).

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

- Repository secret: `NEXUDUS_EMAIL`
- Repository secret: `NEXUDUS_PASSWORD`
- Optional repository variable: `NEXUDUS_BASE_URL`

The workflow installs dependencies, installs the Playwright Chromium browser, runs the test suite, and uploads both the Playwright HTML report and `test-results` as artifacts.

Each workflow run also adds a Playwright summary directly to the GitHub Actions interface. On pushes to `main`, the workflow publishes the HTML report to GitHub Pages so it can be opened in the browser without downloading the artifact first.

To use the published HTML report, enable GitHub Pages for the repository and select GitHub Actions as the source.

## CircleCI

The repository also includes a CircleCI pipeline at [.circleci/config.yml](.circleci/config.yml).

It uses the version-matched Playwright Docker image, runs `npm ci`, executes `npm test`, stores JUnit results from `test-results/results.xml`, and uploads both `playwright-report/` and `test-results/` as CircleCI artifacts.

The workflow is configured to run on every push to every branch in the repository. Tag-only pushes are ignored.

To use it in CircleCI, add these environment variables in the project settings:

- `NEXUDUS_EMAIL`
- `NEXUDUS_PASSWORD`
- Optional: `NEXUDUS_BASE_URL`

You also need to connect the GitHub repository in CircleCI and enable pipelines for the project. Once that is done, each new commit pushed to the repository will trigger the CircleCI workflow automatically.

The Playwright config automatically switches to a CircleCI-friendly reporter set when `CIRCLECI=true`, so test runs produce line output, JUnit XML, and the HTML report without needing a separate script.

## Notes

- The suite is intentionally small and focused on demonstrating Playwright structure and workflow integration.
- The product creation flow currently depends on UI timing and may require maintenance if the Nexudus product screens change.
