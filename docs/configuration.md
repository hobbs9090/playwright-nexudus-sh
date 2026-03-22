# Configuration

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

The suite supports the following environment variables:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXUDUS_AP_BASE_URL` | No | `https://dashboard-staging.nexudus.com/` | Base URL for the AP project |
| `NEXUDUS_AP_EMAIL` | Yes | None | Username for the AP project |
| `NEXUDUS_AP_PASSWORD` | Yes | None | Password for the AP project |
| `NEXUDUS_ADMIN_EMAIL` | No | `NEXUDUS_AP_EMAIL` | Optional dedicated admin-user email for role-based tests |
| `NEXUDUS_ADMIN_PASSWORD` | No | `NEXUDUS_AP_PASSWORD` | Optional dedicated admin-user password for role-based tests |
| `NEXUDUS_AP_MEMBER_NAME` | Yes for AP delivery workflows | `Felicity Ward` via `.env.shared` | Member name used by AP delivery workflow tests |
| `NEXUDUS_AP_RECEIVED_BY_NAME` | Yes for AP delivery workflows | `Steven Hobbs` via `.env.shared` | AP user name expected in the delivery `Received by` field |
| `NEXUDUS_AP_LOCATION_SELECTOR_LABEL` | No | `Coworking Soho (STEVEN)` via `.env.shared` | Visible AP location-selector label that the shared AP login flow selects after sign-in |
| `CRUD_APPEND_RANDOM_SEED` | No | `true` via `.env.shared` | Appends the shared CRUD random seed to created course, product, and event names |
| `NEXUDUS_AP_EVENT_NAME` | No | `Astronomy Night` via `.env.shared` | Base name used when generating AP event titles |
| `NEXUDUS_CONTRIBUTOR_INITIALS` | No | Derived from Git user name when available | Prefix applied to the CRUD random seed, for example `shabcde` |
| `NEXUDUS_MP_BASE_URL` | No | Derived from `NEXUDUS_MP_LOCATION_SELECTOR_LABEL` for the shared staging hosts | Optional explicit custom base URL override for non-standard MP environments |
| `NEXUDUS_MP_EMAIL` | Yes | None | Default member or coworker username for the MP staging project |
| `NEXUDUS_MP_PASSWORD` | Yes | None | Default member or coworker password for the MP staging project |
| `NEXUDUS_MP_LOCATION_SELECTOR_LABEL` | No | `Coworking Soho (STEVEN)` via `.env.shared` | MP location label used to derive the default MP host for public, authenticated, and API-linked flows |
| `NEXUDUS_MP_BOOKING_RESOURCE_NAME` | No | `Large Meeting Room #1` | Optional MP bookings test resource-name override when a different visible room should be booked in staging |
| `NEXUDUS_MEMBER_EMAIL` | No | `NEXUDUS_MP_EMAIL` | Optional dedicated member-user email override for role-based tests |
| `NEXUDUS_MEMBER_PASSWORD` | No | `NEXUDUS_MP_PASSWORD` | Optional dedicated member-user password override for role-based tests |
| `NEXUDUS_CONTACT_EMAIL` | No | None | Optional dedicated contact-user email for role-based tests |
| `NEXUDUS_CONTACT_PASSWORD` | No | None | Optional dedicated contact-user password for role-based tests |
| `NEXUDUS_API_BASE_URL` | No | Derived from the resolved MP host origin | Optional explicit custom base URL override for API tests, for example `https://your-space.spacesstaging.nexudus.com` |
| `NEXUDUS_API_USERNAME` | No | `NEXUDUS_MEMBER_EMAIL`, then `NEXUDUS_MP_EMAIL`, then `NEXUDUS_AP_EMAIL` | Optional username override for API authentication |
| `NEXUDUS_API_PASSWORD` | No | `NEXUDUS_MEMBER_PASSWORD`, then `NEXUDUS_MP_PASSWORD`, then `NEXUDUS_AP_PASSWORD` | Optional password override for API authentication |
| `PLAYWRIGHT_HEADLESS` | No | `false` locally, `true` on CI | Forces headless browser execution |
| `LIGHTHOUSE_MIN_PERFORMANCE` | No | `35` | Minimum Lighthouse performance score for the AP and MP dashboard audits |
| `LIGHTHOUSE_MIN_ACCESSIBILITY` | No | `55` | Minimum Lighthouse accessibility score for the AP and MP dashboard audits |
| `LIGHTHOUSE_MIN_BEST_PRACTICES` | No | `50` | Minimum Lighthouse best-practices score for the AP and MP dashboard audits |
| `GREMLINS_SEED` | No | `1337` | Seed used to replay an exploratory gremlins run |
| `GREMLINS_ACTIONS` | No | `60` | Default number of gremlin actions for public exploratory targets |
| `GREMLINS_DELAY_MS` | No | `35` | Delay between gremlin actions in milliseconds |
| `GREMLINS_MAX_ERRORS` | No | `5` | Maximum browser-side gremlins errors before the helper stops the horde |
| `GREMLINS_SPECIES` | No | `clicker,toucher,formFiller,scroller` | Optional comma-separated species override for exploratory gremlins runs |

The suite currently runs AP admin coverage on the AP dashboard, MP coverage on the resolved MP staging host, and authenticated API smoke plus mutation coverage against the resolved Nexudus API host. It fails fast if the credential pair required for the selected project is missing.

The repo root [`.env.shared`](../.env.shared) and [`.env`](../.env) files are loaded automatically by the npm scripts in this repository. `.env.shared` is intended for tracked team-wide non-sensitive defaults, while `.env` is intended for local secrets and machine-specific overrides. A tracked template is available in [`.env.example`](../.env.example), while `.env` itself is ignored by git.

Example local setup:

```bash
NEXUDUS_AP_EMAIL='your-ap-user@example.com'
NEXUDUS_AP_PASSWORD='your-ap-password'
NEXUDUS_MP_EMAIL='your-mp-member@example.com'
NEXUDUS_MP_PASSWORD='your-mp-member-password'
NEXUDUS_AP_LOCATION_SELECTOR_LABEL='Coworking Soho (STEVEN)'
NEXUDUS_MP_LOCATION_SELECTOR_LABEL='Coworking Soho (STEVEN)'
NEXUDUS_ADMIN_EMAIL='your-admin-user@example.com'
NEXUDUS_ADMIN_PASSWORD='your-admin-password'
NEXUDUS_MEMBER_EMAIL='your-member-user@example.com'
NEXUDUS_MEMBER_PASSWORD='your-member-password'
NEXUDUS_CONTACT_EMAIL='your-contact-user@example.com'
NEXUDUS_CONTACT_PASSWORD='your-contact-password'
NEXUDUS_AP_BASE_URL='https://dashboard-staging.nexudus.com/'
```

Use `NEXUDUS_MP_EMAIL` and `NEXUDUS_MP_PASSWORD` for the default MP member or coworker account. If you also need contact coverage, keep that separate in `NEXUDUS_CONTACT_EMAIL` and `NEXUDUS_CONTACT_PASSWORD` rather than reusing the default MP pair.

For role-based test helpers, the repo now exposes `getConfiguredUserCredentials('admin' | 'member' | 'contact')` from [test-environments.ts](../test-environments.ts). `admin` falls back to the AP credential pair, `member` falls back to the default MP member credential pair, and `contact` must be configured explicitly when a test needs it.

For location-selector helpers, the repo now exposes `getConfiguredLocationSelectorLabel('ap' | 'mp')` from [test-environments.ts](../test-environments.ts). These values are intended for shared test bootstrapping. The AP login flow now switches to the configured AP location after sign-in, and the MP project/API host default to the MP location label for the shared staging spaces. Use `NEXUDUS_MP_BASE_URL` or `NEXUDUS_API_BASE_URL` only when you need a non-standard custom host. The API business-setting tests that verify MP content resolve the matching business for that configured MP location rather than assuming the API user's default business matches the active site. The shared staging defaults currently use `Coworking Soho (STEVEN)`, and the common staging labels are `Coworking Network (STEVEN)`, `Coworking Central Street (STEVEN)`, and `Coworking Soho (STEVEN)`.

The committed [`.env.shared`](../.env.shared) currently provides:

- `NEXUDUS_AP_MEMBER_NAME=Felicity Ward`
- `NEXUDUS_AP_RECEIVED_BY_NAME=Steven Hobbs`
- `NEXUDUS_AP_LOCATION_SELECTOR_LABEL=Coworking Soho (STEVEN)`
- `NEXUDUS_MP_LOCATION_SELECTOR_LABEL=Coworking Soho (STEVEN)`
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
