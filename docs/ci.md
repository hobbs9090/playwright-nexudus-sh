# CI

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

## GitHub Actions workflow

The repository includes a workflow at [.github/workflows/playwright.yml](../.github/workflows/playwright.yml) that runs the normal Playwright suite and the Lighthouse suite on:

- pushes to branches
- pull requests
- manual dispatches

README-only changes are ignored for the `push` and `pull_request` triggers, so documentation-only edits do not start the workflow unless you run it manually.

## Required GitHub settings

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

If the optional API CI variables are not set, the API project falls back to the MP staging host origin and MP credentials that are already configured for the main Playwright run.

## Workflow jobs

The workflow installs dependencies, computes a Playwright shard matrix, installs the Playwright Chromium browser on each selected runner, and runs five CI jobs:

- `Plan Playwright runner fan-out` builds the Playwright execution matrix for the full suite
- `Run Playwright tests` runs the full AP, MP, and API Playwright suite on both `main` and branch builds, and uploads one blob report artifact per job
- `Merge Playwright reports` merges the blob report into the Playwright HTML and JUnit outputs, uploads the merged report, and writes a GitHub job summary
- `Run Lighthouse audits` runs the full authenticated AP and MP Lighthouse suite
- `Publish CI reports` publishes a combined GitHub Pages site on non-PR pushes and manual runs, including branch runs

## Sharding and fan-out

By default the Playwright planner targets roughly five minutes of in-run test execution with conservative serial-duration estimates, which currently scales out to three AP shards plus one MP shard and one API shard. GitHub-hosted runners are provisioned automatically for that matrix.

If the suite grows or shrinks, tune the fan-out with:

- `PLAYWRIGHT_CI_TARGET_MINUTES`
- `PLAYWRIGHT_CI_MAX_SHARDS_PER_PROJECT`
- `PLAYWRIGHT_CI_AP_SHARDS`
- `PLAYWRIGHT_CI_MP_SHARDS`
- `PLAYWRIGHT_CI_API_SHARDS`

## Branch behavior and report publishing

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
