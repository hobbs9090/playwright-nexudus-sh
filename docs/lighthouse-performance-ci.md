# Lighthouse, performance, and CI

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md)

## Running the Lighthouse audits

The repository includes authenticated Lighthouse checks for both AP and MP. These audits run through [playwright.lighthouse.config.ts](../playwright.lighthouse.config.ts) so the regular functional suite stays focused on end-to-end behavior while Lighthouse keeps its own config, retries, thresholds, and report output.

For the underlying audit model, categories, and scoring guidance, see the official Lighthouse documentation from Chrome for Developers: <https://developer.chrome.com/docs/lighthouse/>.

The Lighthouse specs live in [tests/lighthouse](../tests/lighthouse):

- [ap-dashboard-lighthouse.spec.ts](../tests/lighthouse/ap/ap-dashboard-lighthouse.spec.ts) signs into AP and audits the authenticated dashboard
- [mp-dashboard-lighthouse.spec.ts](../tests/lighthouse/mp/mp-dashboard-lighthouse.spec.ts) signs into MP and audits the authenticated dashboard
- [support.ts](../tests/lighthouse/support.ts) manages the persistent Chromium context, authenticated audit flow, report generation, and threshold checks

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
- `LIGHTHOUSE_MIN_ACCESSIBILITY=55`
- `LIGHTHOUSE_MIN_BEST_PRACTICES=50`

In GitHub Actions, the workflow overrides `LIGHTHOUSE_MIN_PERFORMANCE=25` to account for lower and noisier performance scores on GitHub-hosted runners. The shared accessibility floor is `55` because the authenticated MP dashboard on shared staging currently lands in the high 50s even on healthy runs. The Lighthouse helper also compares the rounded category scores that appear in the HTML report, which avoids failing CI on floating-point values such as `24.999999999999996`.

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
- optional `NEXUDUS_AP_BASE_URL`

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

## GitHub Actions

The repository includes a workflow at [.github/workflows/playwright.yml](../.github/workflows/playwright.yml) that runs the normal Playwright suite and the Lighthouse suite on:

- pushes to branches
- pull requests
- manual dispatches

README-only changes are ignored for the `push` and `pull_request` triggers, so documentation-only edits do not start the workflow unless you run it manually.

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
- Optional repository variable: `PLAYWRIGHT_CI_TARGET_MINUTES`
- Optional repository variable: `PLAYWRIGHT_CI_MAX_SHARDS_PER_PROJECT`
- Optional repository variables: `PLAYWRIGHT_CI_AP_SHARDS`, `PLAYWRIGHT_CI_MP_SHARDS`, `PLAYWRIGHT_CI_API_SHARDS`
- GitHub Pages configured to deploy from GitHub Actions
- If the `github-pages` environment has deployment branch rules, allow every branch that should publish reports. If branch report publishing should work everywhere, add a wildcard branch rule such as `*`

The workflow installs dependencies, computes a Playwright shard matrix, installs the Playwright Chromium browser on each selected runner, and runs five CI jobs:

- `Plan Playwright runner fan-out` builds the Playwright execution matrix for the full suite
- `Run Playwright tests` runs the full AP, MP, and API Playwright suite on both `main` and branch builds, and uploads one blob report artifact per job
- `Merge Playwright reports` merges the blob report into the Playwright HTML and JUnit outputs, uploads the merged report, and writes a GitHub job summary
- `Run Lighthouse audits` runs the full authenticated AP and MP Lighthouse suite
- `Publish CI reports` publishes a combined GitHub Pages site on non-PR pushes and manual runs, including branch runs

If the optional API CI variables are not set, the API project falls back to the MP staging host origin and MP credentials that are already configured for the main Playwright run.

By default the Playwright planner targets roughly five minutes of in-run test execution with conservative serial-duration estimates, which currently scales out to three AP shards plus one MP shard and one API shard. GitHub-hosted runners are provisioned automatically for that matrix. If the suite grows or shrinks, tune the target with `PLAYWRIGHT_CI_TARGET_MINUTES`, cap the fan-out with `PLAYWRIGHT_CI_MAX_SHARDS_PER_PROJECT`, or pin a project to a specific shard count with `PLAYWRIGHT_CI_AP_SHARDS`, `PLAYWRIGHT_CI_MP_SHARDS`, or `PLAYWRIGHT_CI_API_SHARDS`.

The branch policy is:

- `main` runs the full functional Playwright suite and the full Lighthouse suite
- non-`main` branches also run the full functional Playwright suite and the full Lighthouse suite
- branch runs still publish the Pages report site

On non-PR pushes and manual runs, the published GitHub Pages site includes:

- the merged Playwright HTML report at `/playwright/`
- the native Lighthouse HTML bundle at `/lighthouse/`
- an index page linking to both reports

The current published GitHub Pages URLs for this repository are:

- Reports index: `https://hobbs9090.github.io/playwright-nexudus-sh/`
- Playwright report: `https://hobbs9090.github.io/playwright-nexudus-sh/playwright/`
- Lighthouse report: `https://hobbs9090.github.io/playwright-nexudus-sh/lighthouse/`

Pull request runs do not publish to GitHub Pages. For PR runs, open the GitHub Actions run and download the uploaded report artifacts instead.

The `k6` smoke tests are local-only and are not executed by the GitHub Actions workflow.

## Notes

- This project should be judged more on the quality of the implementation than the breadth of coverage, because it is intended as a proof of concept for AI-enabled automation test development
- The suite is intentionally small and focused on demonstrating Playwright structure and workflow integration
- The product creation flow currently depends on UI timing and may require maintenance if the Nexudus product screens change
