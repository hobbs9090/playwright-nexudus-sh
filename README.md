# playwright-nexudus-sh

End-to-end Playwright test suite for the Nexudus Admin Panel (AP) dashboard, Nexudus Member Portal (MP), and Nexudus API.

This project is written in TypeScript, uses `@playwright/test` as the test runner, and follows a small page object model structure to keep test flows readable.

## What the suite covers

### AP

- AP login shows a clear error message when invalid credentials are provided
- AP login succeeds with the configured AP credentials
- Admin overview sections render expected capability groupings
- A public cake-decoration history course can be created in AP with seeded titles, images, sections, lessons, discussion-board creation, home-page featuring, and random participant enrolment
- A product can be created and then removed from the products area
- A delivery can be registered, assigned to a user, uploaded with a PDF label, and then removed
- A delivery can be signed for on collection and marked as collected
- An `Astronomy Night` event can be created for the following Saturday

### MP

- MP staging member-portal login succeeds with the configured MP credentials
- MP staging account creation succeeds for new individual accounts
- MP staging account creation succeeds for new company accounts
- MP signed-in members can create help requests from the support area
- MP public footer renders the configured business branding and copyright content
- MP public home page renders the configured plans, add-ons, featured articles, and locations
- MP public visitors can request a tour from the login page

### API

- API authentication returns a bearer token for the configured Nexudus user
- The authenticated API user profile can be retrieved from the Nexudus API
- API business setting `Footer.SayingText` can be updated and verified in MP
- API business setting `Calendars.DefaultView` can be updated and restored for the current business

## Project structure

```text
.
|-- api/
|   `-- NexudusApiClient.ts
|-- .github/workflows/playwright.yml
|-- helpers.ts
|-- page-objects/
|   |-- ap/
|   |   |-- AdminPanelPage.ts
|   |   |-- APLoginPage.ts
|   |   |-- CoursePage.ts
|   |   |-- DeliveryPage.ts
|   |   |-- EventPage.ts
|   |   `-- ProductPage.ts
|   |-- mp/
|   |   |-- MPHelpRequestsPage.ts
|   |   |-- MPHomePage.ts
|   |   |-- MPLoginPage.ts
|   |   |-- MPSignupPage.ts
|   |   `-- MPTourPage.ts
|   `-- shared/
|       `-- AbstractPage.ts
|-- playwright.config.ts
|-- playwright.gremlins.config.ts
|-- playwright.lighthouse.config.ts
|-- scripts/
|   |-- build-lighthouse-report-index.mjs
|   |-- build-pages-report-site.mjs
|   |-- run-with-dotenv.mjs
|   `-- write-github-summary.mjs
|-- tests/
|   |-- ap/
|   |   |-- ap-login.spec.ts
|   |   |-- course-workflows.spec.ts
|   |   |-- admin-panel-overview.spec.ts
|   |   `-- admin-panel-workflows.spec.ts
|   |-- api/
|   |   |-- api-test.ts
|   |   |-- business-settings.spec.ts
|   |   `-- user-info.spec.ts
|   |-- bdd/
|   |   |-- features/
|   |   |   `-- mp/
|   |   |       |-- public-footer-faq.feature
|   |   |       `-- public-home-hero-sign-in.feature
|   |   `-- steps/
|   |       `-- mp-public-navigation.steps.ts
|   |-- fixtures/
|   |   |-- ap-course-cake-decorations-large.png
|   |   |-- ap-course-cake-decorations-small.png
|   |   |-- collection-signature.png
|   |   `-- delivery-label.pdf
|   |-- gremlins/
|   |   |-- mp-portal.gremlins.spec.ts
|   |   |-- mp-public.gremlins.spec.ts
|   |   `-- support/
|   |       `-- gremlins.ts
|   |-- lighthouse/
|   |   |-- ap/
|   |   |   `-- ap-dashboard-lighthouse.spec.ts
|   |   |-- mp/
|   |   |   `-- mp-dashboard-lighthouse.spec.ts
|   |   `-- support.ts
|   `-- mp/
|       |-- mp-help-requests.spec.ts
|       |-- mp-home-content.spec.ts
|       |-- mp-login.spec.ts
|       |-- mp-signup.spec.ts
|       `-- mp-tour.spec.ts
```

## Development setup

If you are a QA engineer who wants to run, debug, or extend the suite locally, the usual setup is:

```bash
git clone https://github.com/hobbs9090/playwright-nexudus-sh.git
cd playwright-nexudus-sh
npm ci
npx playwright install chromium
cp .env.example .env
```

To get fully up and running, a QA would usually need:

- Git installed locally and access to this repository.
- Node.js 24 recommended locally. The repo supports Node.js 18.16 or newer, but matching the CI runtime is usually simpler.
- npm.
- Playwright Chromium installed with `npx playwright install chromium`.
- A local `.env` copied from `.env.example`.
- Working Nexudus staging credentials for AP and for an MP member or coworker account.
- Optional separate API credentials only if the API tests should not reuse the MP credentials.

The repo already loads `.env.shared` first and `.env` second, so team defaults remain available while your local secrets override them. In practice that means a new QA will usually only need to add the AP and MP login credentials unless they want to override the shared defaults for delivery, course, event, or API work.

Helpful local tools are:

- Visual Studio Code.
- The Codex extension for VS Code if you want AI help creating or extending Playwright tests inside the repo.
- GitHub CLI (`gh`) if you want to inspect GitHub Actions runs and logs from the terminal.
- `k6` only if you plan to use the optional performance smoke scripts described later in this README.

If you want to use Codex with this repository:

- Codex is optional. The suite can be run and maintained without it.
- ChatGPT Free or lighter usage tiers can be restrictive for longer Codex sessions, especially when the work involves reading a lot of files, running tests repeatedly, or fixing CI issues.
- A paid plan such as ChatGPT Pro is often more practical for sustained repo work, but plan limits and availability can change over time.
- Even on paid plans, focused prompts help because larger exploratory tasks can consume allowance quickly.

If anyone on the team wants help getting set up or adding new tests, I’d be very happy to help.

## Adding tests with AI

AI tools such as Codex can usually produce a useful first pass from a short prompt. For example:

```text
Create an AP test that sets up a complete published course
with lessons, images, and enrolments, following the existing patterns.
```

That said, more detail will usually produce output that is much closer to what you actually want.

The most effective workflow I have found is to ask Codex in a separate window to help draft the test instructions first, then refine the suggested prompt before using it for the actual implementation work. In practice that usually leads to clearer requirements and less back-and-forth.

When asking AI to add a test, it helps to specify:

- which area the test belongs to: `AP`, `MP`, or `API`
- the exact workflow or business behavior to cover
- any required names, titles, settings, images, participants, or seeded data
- whether the AI should choose sensible defaults when you do not care about the exact values
- where the code should live, for example `tests/ap`, `page-objects/ap`, or `api`
- whether existing page objects, config helpers, or API clients should be reused
- how the flow should be verified locally
- whether the work should be split into logical commits and pushed

The current AP course-creation workflow in
[course-workflows.spec.ts](tests/ap/course-workflows.spec.ts) was created from a
more detailed prompt. The requirements below are the example instructions that
were used to create that last test:

```text
Create an AP test that creates a course called:

"Six million four hundred and fifty-three thousand five hundred and
sixty-eight Hundreds and Thousands: A History of Cake Decorations"

Requirements:

- Add a random seed to the title
- Add 6 lessons, plus an Introduction and summary
- Organise the course into 3 sections: Foundations, Techniques,
  and Finishing & Presentation.
- Use one lesson per cake decorating style.
- If I don’t specify the 6 styles, choose sensible main styles
  yourself.
- Add both a large image and a small image.
- Set This course is published
- Make the course public
- Ensure the course is available in all locations
- Populate all fields with appropriate text that matches the
  subject matter.
- Generate the images with AI and store them in the repo under
  `tests/fixtures/` for reuse.
- Feature this course on the home page after users log in
- Create a discussion board group for members of this course.
- Automatically enrol three random participants (for this and
  future course runs)
- Follow the existing AP test/page-object style already used in
  this repo.
- If needed, use the existing API test/client structure for
  lesson creation rather than ad hoc requests.
- Keep the changes split into logical commits.
- Run the relevant AP test and verify it passes locally before
  commit and push to repository
```

In practice, those requirements asked the AI to build all of the following:

- a new AP end-to-end workflow in
  [course-workflows.spec.ts](tests/ap/course-workflows.spec.ts)
- supporting AP page-object behavior in
  [CoursePage.ts](page-objects/ap/CoursePage.ts)
- reusable API client helpers in
  [NexudusApiClient.ts](api/NexudusApiClient.ts) for reading courses,
  updating courses, creating sections, creating lessons, listing
  coworkers, and enrolling members
- two reusable AI-generated image fixtures under
  [tests/fixtures](tests/fixtures/)
- seeded course-title generation rather than a fixed title
- sensible lesson titles and topics, including details like
  `Lambeth Overpiping`, which turned out to be a real cake-decorating
  technique rather than a made-up phrase. See
  [Joseph Lambeth](https://en.wikipedia.org/wiki/Joseph_Lambeth).
- appropriate course summary, description, overview, section summaries, and lesson content that matched the subject matter
- a mixed UI and API setup flow, with the UI used for course creation and image upload, and the API used for richer course configuration and lesson/member setup
- verification that the course was published, public, available in all locations, featured after login, and configured with a discussion-board group
- verification that all three sections, all eight lessons, and three enrolled participants were present
- local test execution, failure diagnosis, fixes, reruns, logical commits, and push-ready output
- even knew to create this rather fabulous
  [large course image](tests/fixtures/ap-course-cake-decorations-large.png)

Detailed prompts are especially helpful when a test mixes UI automation, API setup, generated fixtures, seeded names, repo conventions, and local verification. You do not always need this much detail, but in practice it reduces back-and-forth and usually gives a result that is closer to ready for review.

## Nexudus documentation

- Knowledge Base: https://help.nexudus.com/
- Developers Hub: https://developers.nexudus.com/reference/getting-started-with-your-api-1

The Developers Hub is the main place to find details about the Nexudus APIs.

The API test infrastructure in this repository uses the public Nexudus API pattern documented there. The current API coverage authenticates with `POST /api/token`, reads the current user profile from `GET /en/user/me`, updates selected `BusinessSetting` records through the REST API, verifies the footer saying in MP, restores the calendar-setting mutation, and exposes reusable helpers for AP course setup such as creating sections, lessons, and members.

When adding tests, follow the existing split:

- Put Admin Panel specs in `tests/ap` and page objects in `page-objects/ap`
- Put Member Portal specs in `tests/mp` and page objects in `page-objects/mp`
- Put API specs in `tests/api` and API client helpers in `api`
- Keep shared browser helpers in `page-objects/shared`

## Configuration

The suite supports the following environment variables:

| Variable                        | Required                      | Default                                                     | Purpose                                                                         |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXUDUS_AP_BASE_URL`           | No                            | `https://dashboard-staging.nexudus.com/`                    | Base URL for the AP project                                                     |
| `NEXUDUS_AP_EMAIL`              | Yes                           | None                                                        | Username for the AP project                                                     |
| `NEXUDUS_AP_PASSWORD`           | Yes                           | None                                                        | Password for the AP project                                                     |
| `NEXUDUS_ADMIN_EMAIL`           | No                            | `NEXUDUS_AP_EMAIL`                                          | Optional dedicated admin-user email for role-based tests                        |
| `NEXUDUS_ADMIN_PASSWORD`        | No                            | `NEXUDUS_AP_PASSWORD`                                       | Optional dedicated admin-user password for role-based tests                     |
| `NEXUDUS_AP_MEMBER_NAME`        | Yes for AP delivery workflows | `Felicity Ward` via `.env.shared`                           | Member name used by AP delivery workflow tests                                  |
| `NEXUDUS_AP_RECEIVED_BY_NAME`   | Yes for AP delivery workflows | `Steven Hobbs` via `.env.shared`                            | AP user name expected in the delivery `Received by` field                       |
| `NEXUDUS_AP_LOCATION_SELECTOR_LABEL` | No                      | `Coworking Soho (STEVEN)` via `.env.shared`                 | Visible AP location-selector label that the shared AP login flow selects after sign-in |
| `CRUD_APPEND_RANDOM_SEED`       | No                            | `true` via `.env.shared`                                    | Appends the shared CRUD random seed to created course, product, and event names |
| `NEXUDUS_AP_EVENT_NAME`         | No                            | `Astronomy Night` via `.env.shared`                         | Base name used when generating AP event titles                                  |
| `NEXUDUS_CONTRIBUTOR_INITIALS`  | No                            | Derived from Git user name when available                   | Prefix applied to the CRUD random seed, for example `shabcde`                   |
| `NEXUDUS_MP_BASE_URL`           | No                            | Derived from `NEXUDUS_MP_LOCATION_SELECTOR_LABEL` for the shared staging hosts | Optional explicit custom base URL override for non-standard MP environments     |
| `NEXUDUS_MP_EMAIL`              | Yes                           | None                                                        | Default member or coworker username for the MP staging project                  |
| `NEXUDUS_MP_PASSWORD`           | Yes                           | None                                                        | Default member or coworker password for the MP staging project                  |
| `NEXUDUS_MP_LOCATION_SELECTOR_LABEL` | No                      | `Coworking Soho (STEVEN)` via `.env.shared`                 | MP location label used to derive the default MP host for public, authenticated, and API-linked flows |
| `NEXUDUS_MEMBER_EMAIL`          | No                            | `NEXUDUS_MP_EMAIL`                                          | Optional dedicated member-user email override for role-based tests              |
| `NEXUDUS_MEMBER_PASSWORD`       | No                            | `NEXUDUS_MP_PASSWORD`                                       | Optional dedicated member-user password override for role-based tests           |
| `NEXUDUS_MEMBER_DEFAULT_PASSWORD` | No                          | `NEXUDUS_MEMBER_PASSWORD`, then `NEXUDUS_MP_PASSWORD`       | Optional shared default password for BDD member-name resolution                 |
| `NEXUDUS_CONTACT_EMAIL`         | No                            | None                                                        | Optional dedicated contact-user email for role-based tests                      |
| `NEXUDUS_CONTACT_PASSWORD`      | No                            | None                                                        | Optional dedicated contact-user password for role-based tests                   |
| `NEXUDUS_API_BASE_URL`          | No                            | Derived from the resolved MP host origin                    | Optional explicit custom base URL override for API tests, for example `https://your-space.spacesstaging.nexudus.com` |
| `NEXUDUS_API_USERNAME`          | No                            | `NEXUDUS_MEMBER_EMAIL`, then `NEXUDUS_MP_EMAIL`, then `NEXUDUS_AP_EMAIL` | Optional username override for API authentication                               |
| `NEXUDUS_API_PASSWORD`          | No                            | `NEXUDUS_MEMBER_PASSWORD`, then `NEXUDUS_MP_PASSWORD`, then `NEXUDUS_AP_PASSWORD` | Optional password override for API authentication                               |
| `PLAYWRIGHT_HEADLESS`           | No                            | `false` locally, `true` on CI                               | Forces headless browser execution                                               |
| `LIGHTHOUSE_MIN_PERFORMANCE`    | No                            | `35`                                                        | Minimum Lighthouse performance score for the AP and MP dashboard audits         |
| `LIGHTHOUSE_MIN_ACCESSIBILITY`  | No                            | `55`                                                        | Minimum Lighthouse accessibility score for the AP and MP dashboard audits       |
| `LIGHTHOUSE_MIN_BEST_PRACTICES` | No                            | `50`                                                        | Minimum Lighthouse best-practices score for the AP and MP dashboard audits      |
| `GREMLINS_SEED`                 | No                            | `1337`                                                      | Seed used to replay an exploratory gremlins run                                 |
| `GREMLINS_ACTIONS`              | No                            | `60`                                                        | Default number of gremlin actions for public exploratory targets                |
| `GREMLINS_DELAY_MS`             | No                            | `35`                                                        | Delay between gremlin actions in milliseconds                                   |
| `GREMLINS_MAX_ERRORS`           | No                            | `5`                                                         | Maximum browser-side gremlins errors before the helper stops the horde          |
| `GREMLINS_SPECIES`              | No                            | `clicker,toucher,formFiller,scroller`                       | Optional comma-separated species override for exploratory gremlins runs         |

The suite currently runs AP admin coverage on the AP dashboard, MP coverage on the resolved MP staging host, and authenticated API smoke plus mutation coverage against the resolved Nexudus API host. It fails fast if the credential pair required for the selected project is missing.

The repo root `.env.shared` and `.env` files are loaded automatically by the npm scripts in this repository. `.env.shared` is intended for tracked team-wide non-sensitive defaults, while `.env` is intended for local secrets and machine-specific overrides. A tracked template is available in `.env.example`, while `.env` itself is ignored by git.

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

Use `NEXUDUS_MP_EMAIL` and `NEXUDUS_MP_PASSWORD` for the default MP member or
coworker account. If you also need contact coverage, keep that separate in
`NEXUDUS_CONTACT_EMAIL` and `NEXUDUS_CONTACT_PASSWORD` rather than reusing the
default MP pair.

For the BDD booking outline, optional member-specific overrides use the
uppercase snake-case pattern
`NEXUDUS_MEMBER_<FULL_NAME>_EMAIL` and
`NEXUDUS_MEMBER_<FULL_NAME>_PASSWORD`, for example
`NEXUDUS_MEMBER_BOB_YOUNGER_EMAIL`. If only the email is resolved, the booking
steps fall back to `NEXUDUS_MEMBER_DEFAULT_PASSWORD`, then
`NEXUDUS_MEMBER_PASSWORD`, then `NEXUDUS_MP_PASSWORD`.

For role-based test helpers, the repo now exposes
`getConfiguredUserCredentials('admin' | 'member' | 'contact')` from
[test-environments.ts](test-environments.ts). `admin` falls back to the AP
credential pair, `member` falls back to the default MP member credential pair,
and `contact` must be configured explicitly when a test needs it.

For location-selector helpers, the repo now exposes
`getConfiguredLocationSelectorLabel('ap' | 'mp')` from
[test-environments.ts](test-environments.ts). These values are intended for
shared test bootstrapping. The AP login flow now switches to the configured AP
location after sign-in, and the MP project/API host default to the MP location
label for the shared staging spaces. Use `NEXUDUS_MP_BASE_URL` or
`NEXUDUS_API_BASE_URL` only when you need a non-standard custom host. The
API business-setting tests that verify MP content resolve the matching business
for that configured MP location rather than assuming the API user's default
business matches the active site. The shared staging defaults currently use
`Coworking Soho (STEVEN)`, and the common staging labels are `Coworking
Network (STEVEN)`, `Coworking Central Street (STEVEN)`, and `Coworking Soho
(STEVEN)`.

The committed [.env.shared](.env.shared) currently provides:

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

## Running and debugging the tests

```bash
# Run the suite
npm test

# Generate the BDD proof-of-concept tests from Gherkin
npm run test:bdd:gen

# Run the BDD proof of concept
npm run test:bdd

# Run the opt-in gremlins exploratory pack
npm run test:gremlins

# Run only the API project
npm run test:api

# Run the MP mobile-view smoke checks in Android Chrome
npx playwright test --project "MP Android Chrome"

# Run the MP mobile-view smoke checks in iPhone Safari
npx playwright test --project "MP iPhone Safari"

# Run in headed mode
npm run test:headed

# Run a test with the Playwright Inspector so you can step through it manually
node scripts/run-with-dotenv.mjs -- npx playwright test tests/mp/mp-bookings.spec.ts --project "MP Staging Chromium" --debug

# Run the gremlins pack in headed mode
npm run test:gremlins:headed

# Run only the delivery workflow tagged with @3093
npx playwright test -g @3093

# Run only the delivery workflow tagged with @3093 in headed mode
npx playwright test --headed -g @3093

# Open the latest HTML report
npm run test:report
```

Use Playwright's `--debug` mode when you want the Inspector window with pause, step, and resume controls. In this repo the usual pattern is to keep the existing dotenv loader and add `--debug` to the Playwright command, as shown in the MP booking example above.

By default the suite runs three projects: `AP Chromium`, `MP Staging Chromium`, and `API`. `AP Chromium` includes the admin overview, admin workflow, AP login, and AP course-creation specs against the dashboard application. `MP Staging Chromium` covers the member-portal login flow, public signup coverage, signed-in help-request coverage, public request-a-tour coverage, and public home-content checks against the spaces staging application. `API` uses the configured MP host origin by default, authenticates against `/api/token`, and runs API-only coverage under `tests/api`, including business-setting mutation checks and MP footer verification. If you only want one target, use Playwright's project filter, for example `npx playwright test --project "API"`.

The repo also includes two opt-in MP mobile browser projects:

- `MP Android Chrome` uses Playwright's `Pixel 5` device profile with Chromium to exercise MP flows in an Android Chrome-style mobile view.
- `MP iPhone Safari` uses Playwright's `iPhone 12` device profile with WebKit to exercise MP flows in an iPhone Safari-style mobile view.

These projects are intended for responsive browser coverage of the member portal. They are useful for checking layout, navigation, and core journeys in mobile-sized Chrome and Safari browser contexts without changing the default desktop-first suite.

The environment split is explicit in code:

- AP-specific page objects live in [page-objects/ap](page-objects/ap), while
  MP-specific page objects live in [page-objects/mp](page-objects/mp).
- Shared low-level behavior stays in
  [AbstractPage.ts](page-objects/shared/AbstractPage.ts).

### Mobile views and native-device testing

If you want mobile confidence in this repo, the most practical approach is to treat mobile browser coverage and native-device coverage as two related but different layers.

- Start with the included Playwright mobile browser projects for MP flows that matter on phones, such as the public home page, hero sign-in, FAQ, and authenticated login.
- `MP Android Chrome` is the Android-facing mobile browser project and `MP iPhone Safari` is the iOS-facing mobile browser project. They give us responsive browser coverage for Chrome- and Safari-style mobile views inside Playwright.
- Keep the default suite desktop-first unless there is a clear product reason to run mobile browser coverage on every commit.
- Prefer opt-in mobile projects instead of mixing phone coverage into the existing AP, MP, and API defaults.
- Focus AP mobile checks on responsive sanity only, because the AP dashboard is primarily a desktop workflow.
- Reuse the existing MP page objects where possible, but keep mobile assertions looser and centered on visible outcomes rather than brittle layout details.

These mobile Playwright projects are still browser tests. They help us validate MP in mobile-sized Chrome and Safari contexts, but they do not replace true native-device testing.

- Use real iOS and Android devices, or a device cloud, when a change depends on true mobile browser behavior such as iOS Safari quirks, Android Chrome keyboard/input behavior, touch handling, camera access, file uploads, permissions, or install-to-home-screen behavior.
- If the product also ships as a native mobile app, keep Playwright for web and mobile-web coverage and add a separate native automation layer for app-specific behavior. Reuse the business scenarios and test data, but do not try to reuse raw web selectors directly in native tests.

In practice, a good first step is a small MP mobile smoke pack that checks the public home page, hero sign-in, footer FAQ, and authenticated login journey in both `MP Android Chrome` and `MP iPhone Safari`, then expand device coverage only where the extra signal is worth it.

### BDD proof of concept

The repo has a small `playwright-bdd` proof of concept that sits alongside the existing `@playwright/test` suite rather than replacing it. It lives under [tests/bdd](tests/bdd), uses its own config in [playwright.bdd.config.ts](playwright.bdd.config.ts), and currently covers two public MP documentation flows plus one opt-in booking utility:

- hero sign-in from the public home page reaches `/login`
- footer `FAQ` from the public home page reaches `/faq`
- an opt-in MP booking utility in [tests/bdd/features/mp/member-bookings.feature](tests/bdd/features/mp/member-bookings.feature) using a tagged serial `Scenario Outline` and `Examples` table

The generated Playwright specs are written to `tests/bdd/.features-gen/` and are ignored by git.

#### Public examples

Example Gherkin for the login proof of concept:

```gherkin
@bdd @mp @public
Feature: MP public home hero sign in
  As an anonymous visitor
  I want the hero sign-in link to reach the login form
  So that I can start signing into the member portal

  Scenario: public home hero sign-in reaches login
    Given I am on the public member portal home page
    When I open the hero sign-in link
    Then I should reach the anonymous login page
```

Example usage:

```bash
# Generate the Playwright specs from the feature files
npm run test:bdd:gen

# Generate and run the default BDD examples
npm run test:bdd

# Generate and run the BDD examples in headed mode
npm run test:bdd:headed

# Open the dedicated BDD HTML report
npm run test:bdd:report
```

To extend the proof of concept:

- add a new `.feature` file under `tests/bdd/features`
- add matching step definitions under `tests/bdd/steps`
- keep the step definitions thin and reuse existing page objects from `page-objects/mp`
- rerun `npm run test:bdd`

#### Testing utilities

The MP booking outline in [tests/bdd/features/mp/member-bookings.feature](tests/bdd/features/mp/member-bookings.feature) is a testing utility rather than a normal CI-style assertion pack. It is tagged `@utility` and `@mode:serial` so it stands out in reports and the example rows run one at a time instead of competing for the same booking data.

This utility is best used to save time during manual testing:

- create realistic member-portal booking data quickly
- verify a path with known bookings in place
- remove those same bookings later without repeating the work manually in the UI

The step file explicitly skips this utility in CI. Outside CI, the utility defaults to `add` mode when `NEXUDUS_BDD_BOOKING_ACTION` is unset.

The utility is controlled by one optional env var, `NEXUDUS_BDD_BOOKING_ACTION`, which is also documented in [`.env.example`](.env.example):

- `add`: create the bookings described by the `Examples` rows and leave them in place for manual testing
- `delete`: cancel the booking ids stored by the most recent add run for the same example rows
- unset: use the default `add` mode

Utility commands:

```bash
# Add the example bookings and leave them in place
# This is also the default if you omit NEXUDUS_BDD_BOOKING_ACTION
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/mp/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Delete the bookings created by the most recent add run for the same rows
NEXUDUS_BDD_BOOKING_ACTION=delete node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/mp/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Run the utility in headed mode if you want to watch it
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/mp/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1 --headed
```

The utility stores created booking ids under `playwright/.cache/mp-booking-utility-state.json`, so the later `delete` run can remove those same bookings instead of matching broadly against every similar booking in the portal. If that stored state is missing, delete mode falls back to finding active bookings that still match the example row so you can recover from an interrupted utility session.

The current outline is intentionally formatted as a serial utility outline:

```gherkin
@bdd @mp @bookings @utility @mode:serial
Feature: MP booking utility
  As a tester
  I want to add or delete MP booking data from example rows
  So that I can prepare or remove manual test data quickly

  Background:
    Given the MP booking utility action is configured

  Scenario Outline: utility manages "<Resource name>" for "<Member Name>" on "<Date>" at "<Start time>" with "<Repeat options>" and alternative "<Alternative>"
    Given member "<Member Name>" can access the member portal
    When they prepare a booking utility request for "<Resource name>"
    And the requested date is "<Date>"
    And the requested start time is "<Start time>"
    And the requested length is "<Length>"
    And the requested repeat option is "<Repeat options>"
    And alternative booking is "<Alternative>"
    And they run the MP booking utility
    Then the booking utility should finish successfully
```

The current example rows cover:

- an exact non-repeating booking
- an alternative-enabled booking where the requested slot can move to a nearby acceptable fallback
- a workday recurrence
- a weekly weekday recurrence

The booking utility resolves `Member Name` by:

- matching the configured default MP member if the requested full name is the same user
- then checking optional per-member env vars such as `NEXUDUS_MEMBER_BOB_YOUNGER_EMAIL`
- then falling back to a coworkers API lookup by full display name

The password resolution order is:

- `NEXUDUS_MEMBER_<DISPLAY_NAME>_PASSWORD` when a per-member override is configured
- `NEXUDUS_MEMBER_DEFAULT_PASSWORD` when set
- otherwise the configured default member password from `NEXUDUS_MEMBER_PASSWORD` or `NEXUDUS_MP_PASSWORD`

The utility supports these scenario outline parameters:

- `Date`: `dd/mm/yyyy`, `today`, `tomorrow`, and `next <weekday>`
- `Start time`: values such as `09:00`, `9am`, and `2:30pm`
- `Length`: values such as `30 minutes`, `1 hour`, `2 hours`, and `90 minutes`
- `Repeat options`: `Does not repeat`, `Every workday`, and `Every day on <weekday>`
- `Alternative`: `true/false` or `yes/no`

The scenario outline parameters mean:

- `Member Name`: full member display name as it appears in Nexudus, for example `Bob Younger`
- `Resource name`: exact MP resource label, for example `Large Meeting Room #1`
- `Date`: the requested booking date in exact or natural-language form
- `Start time`: the requested start time for the booking window
- `Length`: the requested booking duration
- `Repeat options`: how the booking should recur in the MP repeat control
- `Alternative`: whether the scenario may accept a sensible fallback instead of failing on the exact requested slot

The current feature file uses rows like these:

- `Bob Younger | Large Meeting Room #1 | next Tuesday | 9am | 30 minutes | Does not repeat | true`
- `Bob Younger | Large Meeting Room #1 | tomorrow | 7pm | 30 minutes | Does not repeat | false`
- `Bob Younger | Large Meeting Room #1 | next Wednesday | 7pm | 30 minutes | Every workday | false`
- `Bob Younger | Large Meeting Room #1 | 23/03/2026 | 7:30pm | 30 minutes | Every day on Monday | false`

For `Every day on <weekday>`, the helper maps that input to the portal's built-in weekly repeat option for the selected weekday, for example `Every week on Monday`. The requested booking date must already fall on that weekday.

For `Alternative=true`, the helper applies this fallback rule:

- first keep the same resource and same date, then choose the nearest available start time that still fits the requested duration
- if that day has no acceptable slot, keep the same resource and same requested start time, then search the next few future dates for the first bookable alternative

If `Alternative=false`, the exact requested slot must be bookable or the scenario fails.

Delete mode uses the MP booking cancellation API rather than UI clicks. Cancelled rows can remain visible in My Activity, so the utility treats "cancelled or removed" as a successful delete outcome. Delete mode prefers the stored booking ids created by the add run, and only falls back to matching active bookings when that stored state is unavailable.

### Gremlins exploratory testing

The repo has a small opt-in `gremlins.js` layer for exploratory MP robustness checks. This sits alongside the deterministic `@playwright/test` suite and does not run as part of `npm test`.

Official gremlins.js docs: [marmelab/gremlins.js](https://github.com/marmelab/gremlins.js)

The gremlins coverage lives under [tests/gremlins](tests/gremlins), uses its own config in [playwright.gremlins.config.ts](playwright.gremlins.config.ts), and injects `node_modules/gremlins.js/dist/gremlins.min.js` with `page.addInitScript(...)` before starting each horde.

The first safe targets are:

- MP public home page
- MP public FAQ page
- MP authenticated language settings page

The helper in [tests/gremlins/support/gremlins.ts](tests/gremlins/support/gremlins.ts) keeps the default horde conservative and reproducible:

- prints the chosen seed so a failure can be replayed
- defaults to a small action count and pace
- captures browser `console.error`, uncaught page errors, crashes, and meaningful same-origin request failures
- fails if the page becomes unusable after the attack

Example usage:

```bash
# Run the default opt-in gremlins pack
npm run test:gremlins

# Run the same pack in headed mode
npm run test:gremlins:headed

# Run the gremlins MP project explicitly
npm run test:gremlins:mp

# Replay a failure with the same seed
GREMLINS_SEED=1337 npm run test:gremlins

# Tune the horde locally
GREMLINS_SEED=20260321 GREMLINS_ACTIONS=90 GREMLINS_DELAY_MS=20 npm run test:gremlins

# Open the dedicated gremlins HTML report
npm run test:gremlins:report
```

These tests are intentionally opt-in because they are exploratory rather than deterministic product assertions. They are useful for finding client-side brittleness, but they should not replace the normal AP, MP, API, Lighthouse, or BDD coverage.

For the current authenticated MP target, the helper ignores the specific OneSignal native-push unsupported-environment error that Playwright can trigger during exploratory runs. That keeps the signal focused on portal survivability rather than browser-push support.

Do not target the following with gremlins in this repo:

- AP create, update, or delete workflows
- payment, checkout, or invoice collection paths
- account/profile mutation forms unless the test is purpose-built to isolate them
- notification opt-in or other browser-permission flows

### AP tests

- [ap-login.spec.ts](tests/ap/ap-login.spec.ts) covers invalid and valid AP login
- [admin-panel-overview.spec.ts](tests/ap/admin-panel-overview.spec.ts) checks
  the main AP sections and capability groups
- [admin-panel-workflows.spec.ts](tests/ap/admin-panel-workflows.spec.ts)
  covers members, bookings, invoices, events, help-desk, deliveries,
  products, and event creation
- [course-workflows.spec.ts](tests/ap/course-workflows.spec.ts) creates a public
  AP course titled
  `Six million four hundred and fifty-three thousand five hundred and sixty-eight Hundreds and Thousands: A History of Cake Decorations`
  with a random seed, three sections, eight lessons, uploaded large and small
  fixture images, discussion-board setup, home-page featuring, and three
  randomly enrolled participants

### MP tests

- [mp-login.spec.ts](tests/mp/mp-login.spec.ts) opens the member-portal
  `/login` page and verifies the authenticated dashboard
- [mp-signup.spec.ts](tests/mp/mp-signup.spec.ts) creates new public MP
  accounts for both individual and company journeys
- [mp-help-requests.spec.ts](tests/mp/mp-help-requests.spec.ts) signs into MP,
  opens the support area, creates a help request, and verifies it appears in
  the member's request list
- [mp-home-content.spec.ts](tests/mp/mp-home-content.spec.ts) verifies the
  configured public footer branding, plans, add-ons, featured articles, and
  locations on the MP home page
- [mp-tour.spec.ts](tests/mp/mp-tour.spec.ts) opens the public `request a tour`
  journey from the MP login page, submits a uniquely seeded request, and
  verifies the completion screen

### API tests

- [business-settings.spec.ts](tests/api/business-settings.spec.ts)
  authenticates against the Nexudus API, updates `Footer.SayingText` and
  verifies it in MP, and updates plus restores `Calendars.DefaultView` for the
  current business
- [user-info.spec.ts](tests/api/user-info.spec.ts) authenticates against the
  Nexudus API and verifies that the current user profile can be read from
  `/en/user/me`

Note: the `Footer.SayingText` test intentionally leaves the updated footer
saying in place so the API mutation can be demonstrated in MP as well. This is
for demo purposes only; in a stricter production suite, shared business
settings would usually be restored after verification.

## Running the Lighthouse audits

The repository also includes authenticated Lighthouse checks for both AP and MP.
These audits run through
[playwright.lighthouse.config.ts](playwright.lighthouse.config.ts) so the
regular functional suite stays focused on end-to-end behavior while Lighthouse
keeps its own config, retries, thresholds, and report output.

For the underlying audit model, categories, and scoring guidance, see the official Lighthouse documentation from Chrome for Developers: <https://developer.chrome.com/docs/lighthouse/>.

The Lighthouse specs live in [tests/lighthouse](tests/lighthouse):

- [ap-dashboard-lighthouse.spec.ts](tests/lighthouse/ap/ap-dashboard-lighthouse.spec.ts)
  signs into AP and audits the authenticated dashboard
- [mp-dashboard-lighthouse.spec.ts](tests/lighthouse/mp/mp-dashboard-lighthouse.spec.ts)
  signs into MP and audits the authenticated dashboard
- [support.ts](tests/lighthouse/support.ts) manages the persistent Chromium
  context, authenticated audit flow, report generation, and threshold checks

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
- Optional `NEXUDUS_AP_BASE_URL`

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

The repository includes a workflow at [.github/workflows/playwright.yml](.github/workflows/playwright.yml) that runs the normal Playwright suite and the Lighthouse suite on:

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

- This project should be judged more on the quality of the implementation than the breadth of coverage, because it is intended as a proof of concept for AI-enabled automation test development.
- The suite is intentionally small and focused on demonstrating Playwright structure and workflow integration.
- The product creation flow currently depends on UI timing and may require maintenance if the Nexudus product screens change.
