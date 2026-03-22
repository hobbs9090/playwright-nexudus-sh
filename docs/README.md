# Documentation

[Repository README](../README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Lighthouse, performance, and CI](lighthouse-performance-ci.md)

Use this index as the GitHub-friendly entry point for the longer project documentation.

## Core guides

- [Getting started](getting-started.md): what the suite covers, repo structure, local setup, and suggested tooling
- [Configuration](configuration.md): environment variables, `.env.shared` and `.env` behavior, credential fallbacks, and seeded naming rules
- [Authoring tests](authoring-tests.md): AI-assisted test-writing guidance, example prompts, and Nexudus documentation links

## Test guides

- [Running tests](running-tests.md): Playwright commands, mobile browser projects, gremlins, and current AP/MP/API test coverage
- [BDD tests](bdd-tests.md): `playwright-bdd` proof of concept, feature generation, execution, and extension
- [Testing utilities](testing-utilities.md): opt-in BDD booking utility flows used to create or clean up manual test data

## Reference

- [Lighthouse, performance, and CI](lighthouse-performance-ci.md): Lighthouse audits, k6 smoke tests, report outputs, GitHub Actions, and project notes
- [Member Portal documentation-derived scenarios](member-portal-documentation-scenarios.md): documentation-to-test coverage mapping for MP scenarios

## Common entry points

```bash
# Main suite
npm test

# BDD proof of concept
npm run test:bdd

# Gremlins exploratory pack
npm run test:gremlins

# Lighthouse audits
npm run test:lighthouse
```
