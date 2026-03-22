# Lighthouse and performance

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Gremlins](gremlins.md)

## Running the Lighthouse audits

The repository includes authenticated Lighthouse checks for both AP and MP. These audits run through [playwright.lighthouse.config.ts](../playwright.lighthouse.config.ts) so the regular functional suite stays focused on end-to-end behavior while Lighthouse keeps its own config, retries, thresholds, and report output.

For GitHub Actions workflow setup, required secrets, sharding, and Pages publishing, see [CI](ci.md).

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
