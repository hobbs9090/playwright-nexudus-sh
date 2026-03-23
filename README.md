# playwright-nexudus-sh

End-to-end Playwright test suite for the Nexudus Admin Panel (AP), Nexudus Member Portal (MP), and Nexudus API.

The suite is written in TypeScript, uses `@playwright/test`, and follows a small page-object structure so the main workflows stay readable. The detailed runbooks and reference material now live under [`docs/`](docs/README.md) so the landing page stays short and the guidance is easier to navigate on GitHub.

## What it is for

This framework is for teams working with Nexudus who want a small but practical automation base for regression coverage, exploratory checks, and test-data utilities.

It is most useful for:

- QA engineers building and maintaining staged end-to-end coverage
- developers who want fast feedback on AP, MP, and API changes
- consultants, support, and implementation teams who need repeatable ways to create or clean up test data
- teams experimenting with AI-assisted test authoring without losing a conventional Playwright structure

## Framework features

- One TypeScript Playwright framework for AP, MP, and API coverage in a single repo
- MP mobile browser coverage for Android Chrome-style and iPhone Safari-style journeys
- AI-friendly structure and prompt guidance that make it practical to draft, refine, and extend tests with Codex while still keeping the result maintainable
- Explicit separation between AP, MP, API, and shared layers so page objects, helpers, and tests stay organised by concern
- small page-object model to keep workflows readable and reusable
- environment-driven configuration with shared defaults in `.env.shared` and local overrides in `.env`
- deterministic UI tests backed by API helpers for setup, verification, and cleanup
- optional `playwright-bdd` layer for Gherkin-driven scenarios and scenario outlines
- opt-in testing utilities for repeatable manual test-data creation and cleanup
- opt-in gremlins.js exploratory testing kept separate from normal regression runs
- Lighthouse and k6 support for lightweight performance and CI visibility
- CI-friendly separation between deterministic core coverage and opt-in utility or exploratory layers
- GitHub-friendly docs under [`docs/`](docs/README.md) for setup, running, configuration, and extension guidance

## Quick start

```bash
git clone https://github.com/hobbs9090/playwright-nexudus-sh.git
cd playwright-nexudus-sh
npm ci
npx playwright install chromium
cp .env.example .env
npm test
```

The repo loads `.env.shared` first and `.env` second, so tracked shared defaults stay available while local secrets override them.

## Documentation

- [Documentation index](docs/README.md): entry point for the guides below

### Core guides

- [Getting started](docs/getting-started.md): coverage summary, project structure, local setup, and useful tooling
- [Configuration reference](docs/configuration.md): environment variables, credential resolution, location defaults, and shared seed behavior
- [CI](docs/ci.md): GitHub Actions workflow, required secrets and variables, sharding, and report publishing
- [Authoring tests](docs/authoring-tests.md): AI-assisted test-writing guidance, prompt examples, and authoring workflow

### Test guides

- [Running tests](docs/running-tests.md): everyday Playwright commands, Android and iOS mobile projects, and current AP/MP/API coverage
- [BDD tests](docs/bdd-tests.md): `playwright-bdd` proof-of-concept setup, generation, execution, and extension
- [Testing utilities](docs/testing-utilities.md): patterns for opt-in utility-style flows including booking utilities, AP meeting-room seeding, and cleanup scripts
- [Gremlins](docs/gremlins.md): opt-in exploratory robustness runs, seed replay, and safe target guidance
- [Lighthouse and performance](docs/lighthouse-performance-ci.md): Lighthouse runs, k6 smoke tests, and report outputs

### Reference

- [Nexudus reference](docs/nexudus-reference.md): official Nexudus product and API documentation links used when extending the repo

### Experimental

- [Member Portal documentation-derived scenarios](docs/member-portal-documentation-scenarios.md): mapping between Nexudus MP docs and current automation coverage

## Common commands

```bash
# Main functional suite
npm test

# BDD proof of concept
npm run test:bdd

# Add-only AP meeting-room seed utility
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/ap/meeting-room-seed-utility.feature.spec.js --project "MP BDD Chromium" --workers=1

# Delete all tracked seeded resources
npm run test:bdd:resources:delete-all

# Opt-in gremlins exploratory pack
npm run test:gremlins

# Authenticated Lighthouse audits
npm run test:lighthouse

# Open the latest Playwright HTML report
npm run test:report
```

For setup details, configuration, CI expectations, and the full command catalogue, use the linked pages in [`docs/`](docs/README.md).

## Notes

- This project should be judged more on the quality of the implementation than the breadth of coverage, because it is intended as a proof of concept for AI-enabled automation test development
- The suite is intentionally small and focused on demonstrating Playwright structure and workflow integration
- The product creation flow currently depends on UI timing and may require maintenance if the Nexudus product screens change
