# playwright-nexudus

End-to-end Playwright test suite for the Nexudus dashboard.

This project is written in TypeScript, uses `@playwright/test` as the test runner, and follows a small page object model structure to keep test flows readable.

## What the suite covers

- Invalid login shows a clear error message
- Valid login reaches the dashboard
- A product can be created and then removed from the products area

## Project structure

```text
.
|-- .github/workflows/playwright.yml
|-- helpers.ts
|-- page-objects/
|   |-- AbstractPage.ts
|   |-- LoginPage.ts
|   `-- ProductPage.ts
|-- playwright.config.ts
|-- tests/
|   `-- nexudus.spec.ts
`-- playwright-report-example/
```

## Prerequisites

- Node.js 18 or newer
- npm

## Installation

```bash
git clone https://github.com/hobbs9090/playwright-nexudus.git
cd playwright-nexudus
npm ci
npx playwright install chromium
```

## Configuration

The suite supports the following environment variables:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXUDUS_BASE_URL` | No | `https://dashboard.nexudus.com/` | Base URL used by Playwright navigation |
| `NEXUDUS_EMAIL` | Recommended | fallback value in code | Username for the valid login flow |
| `NEXUDUS_PASSWORD` | Recommended | fallback value in code | Password for the valid login flow |
| `PLAYWRIGHT_HEADLESS` | No | `false` locally, `true` on CI | Forces headless browser execution |

For reliable local runs, set `NEXUDUS_EMAIL` and `NEXUDUS_PASSWORD` to a working test account instead of relying on fallback values.

## Running the tests

```bash
# Run the suite
npm test

# Run in headed mode
npm run test:headed

# Open the latest HTML report
npm run test:report
```

By default the active browser project is Chromium. Other browser projects are still present in [playwright.config.ts](playwright.config.ts) but commented out.

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

## Notes

- The suite is intentionally small and focused on demonstrating Playwright structure and workflow integration.
- The product creation flow currently depends on UI timing and may require maintenance if the Nexudus product screens change.
