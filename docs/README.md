# Documentation

[Repository README](../README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

Use this index as the GitHub-friendly entry point for the longer project documentation.

## Core guides

- [Getting started](getting-started.md): what the suite covers, repo structure, local setup, and suggested tooling
- [Configuration](configuration.md): environment variables, `.env.shared` and `.env` behavior, credential fallbacks, and seeded naming rules
- [CI](ci.md): GitHub Actions workflow structure, required secrets and variables, sharding, and report publishing
- [Authoring tests](authoring-tests.md): AI-assisted test-writing guidance, example prompts, and Nexudus documentation links

## Test guides

- [Running tests](running-tests.md): Playwright commands, mobile browser projects, and current AP/MP/API test coverage
- [BDD tests](bdd-tests.md): `playwright-bdd` proof of concept, feature generation, execution, and extension
- [Testing utilities](testing-utilities.md): opt-in booking utilities, the AP meeting-room seed utility, and local cleanup commands
- [Gremlins](gremlins.md): opt-in exploratory robustness runs, horde tuning, and safe target guidance
- [Lighthouse and performance](lighthouse-performance-ci.md): Lighthouse audits, k6 smoke tests, and report outputs

## Reference

- [Member Portal documentation-derived scenarios](member-portal-documentation-scenarios.md): documentation-to-test coverage mapping for MP scenarios

## Common entry points

```bash
# Main suite
npm test

# BDD proof of concept
npm run test:bdd

# Add-only AP meeting-room seed utility
npm run test:bdd:gen
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/ap/meeting-room-seed-utility.feature.spec.js --project "MP BDD Chromium" --workers=1

# Delete all tracked seeded resources
npm run test:bdd:resources:delete-all

# Gremlins exploratory pack
npm run test:gremlins

# Lighthouse audits
npm run test:lighthouse
```
