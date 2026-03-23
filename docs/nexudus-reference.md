# Nexudus Reference

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

This page collects the main official Nexudus product and API references that are useful when extending this repository.

## Official documentation

- Knowledge Base: https://help.nexudus.com/
- Developers Hub: https://developers.nexudus.com/reference/getting-started-with-your-api-1

## How this repo uses the official docs

The Developers Hub is the main place to confirm the public Nexudus API shape used by this repository.

The API test infrastructure in this repo follows that public API pattern. The current API coverage authenticates with `POST /api/token`, reads the current user profile from `GET /en/user/me`, updates selected `BusinessSetting` records through the REST API, verifies MP-facing changes, and exposes reusable helpers for AP setup flows such as creating sections, lessons, and members.

For MP coverage planning based on official product docs, see [Member Portal documentation-derived scenarios](member-portal-documentation-scenarios.md).
