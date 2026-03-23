# Testing utilities

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

Use this page for utility-style test flows that help create or clean up manual test data without turning those scenarios into normal CI assertions. A good fit for this repo is a set of booking utility features that can add realistic booking data through MP UI, AP UI, or the API before a manual test session and remove it again afterwards.

Testing utilities are best used to save time during manual testing:

- create realistic booking data quickly through MP UI, AP UI, or the API
- verify a path with known bookings in place
- remove those same bookings later without repeating the work manually in the UI

The booking utility intentionally supports three booking-seeding methods: MP UI, AP UI, and the API. In practice, that is more variety than most teams need for manual test setup. In this repo, the three-way split is included mainly as a showcase of the framework's versatility across UI and API surfaces, not as a recommendation that every environment-seeding utility should offer all three.

AP is also the hardest surface in this repo to automate reliably. The AP UI tends to be more complex, more stateful, and more prone to brittle interactions than the MP or direct API paths, so AP-facing utilities are best kept tightly scoped and should not be treated as the default choice just because a workflow exists there.

That is also worth keeping in mind when AI is helping to build or extend these utilities. The model will often be persistent about finding a way to make the scenario work, and if a UI-only path is difficult it may lean toward API-assisted setup or verification unless the intended boundary is stated clearly. Review and validation should always check that the finished utility still matches the behaviour you actually wanted to demonstrate.

Utilities in this repo should be clearly opt-in:

- tag them `@utility` so they stand out in reports
- keep them serial when rows could compete for shared data
- keep them out of CI by default; the BDD config excludes `@utility` scenarios when `CI=true`
- prefer explicit add and delete modes when the utility really needs both paths, or a dedicated cleanup script when an add-only utility flow is simpler and safer

A booking utility pattern in this repo is mainly controlled by one optional action env var, while the current feature files are split by surface and hard-code `mp`, `ap`, or `api` in Gherkin. The env vars are also documented in [`.env.example`](../.env.example):

- `add`: create the bookings described by the `Examples` rows and leave them in place for manual testing
- `delete`: cancel the booking ids stored by the most recent add run for the same example rows
- unset: use the default `add` mode

- `NEXUDUS_BDD_BOOKING_MODE`: optional fallback default only if a utility scenario omits the mode step entirely; the current surface-specific features set the mode explicitly in Gherkin
- `mp`: run that feature through the member-portal UI
- `ap`: run that feature through the AP bookings UI
- `api`: run that feature through the authenticated back-office API
- the current booking utility source files live at [tests/bdd/features/mp/member-bookings.feature](../tests/bdd/features/mp/member-bookings.feature), [tests/bdd/features/ap/member-bookings.feature](../tests/bdd/features/ap/member-bookings.feature), and [tests/bdd/features/api/member-bookings.feature](../tests/bdd/features/api/member-bookings.feature)

## Example utility commands

```bash
# Add the example bookings and leave them in place.
# Replace <generated-utility-spec> with the generated Playwright spec for the utility feature.
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts <generated-utility-spec> --project "MP BDD Chromium" --workers=1

# Delete the bookings created by the most recent add run for the same rows
NEXUDUS_BDD_BOOKING_ACTION=delete node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts <generated-utility-spec> --project "MP BDD Chromium" --workers=1

# Delete every booking id currently tracked by the booking utility cache
npm run test:bdd:bookings:delete-all

# Run the utility in headed mode if you want to watch it
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts <generated-utility-spec> --project "MP BDD Chromium" --workers=1 --headed
```

For booking-utility debug sessions:

- `mp` rows show the member-portal booking flow in the browser
- `ap` rows show the AP bookings flow in the browser
- `api` rows create bookings directly through the back-office API, so there is no browser-side booking form or save flow to step through
- the current feature keeps API rows on a dedicated API execution step so they compile without Playwright's `page` fixture and do not open a browser window unnecessarily
- if you want a row to be visually step-throughable in Playwright debug, use `mp` or `ap` instead of `api`

A booking utility should store created ids in a small cache file so the later `delete` run can remove those same records instead of matching broadly against every similar booking. In this repo, the AP utility path is intentionally stricter: AP delete reuses the cached ids through the AP UI only, and it fails clearly if that stored state is missing rather than silently switching to the API or trying a broad UI search.

## Example utility outline

The current layout keeps one booking utility feature per surface so the folder structure and the booking mode stay aligned:

```gherkin
@bdd @mp @bookings @utility @mode:serial
Feature: MP booking utility
  As a tester
  I want to add or delete booking data through the member portal UI
  So that I can prepare or remove manual test data quickly

  Background:
    Given the booking utility configuration is ready

  Scenario Outline: MP utility manages "<Resource name>" for "<Member Name>" on "<Date>" at "<Start time>" with "<Repeat options>" and alternative "<Alternative>"
    Given member "<Member Name>" can access the member portal
    And the booking utility mode is "mp"
    When they prepare a booking utility request for "<Resource name>"
    And the requested date is "<Date>"
    And the requested start time is "<Start time>"
    And the requested length is "<Length>"
    And the requested repeat option is "<Repeat options>"
    And alternative booking is "<Alternative>"
    And they run the browser booking utility
    Then the booking utility should finish successfully

@bdd @ap @bookings @utility @mode:serial
Feature: AP booking utility
  ...
  Scenario Outline: AP utility manages "<Resource name>" for "<Member Name>" on "<Date>" at "<Start time>" with "<Repeat options>" and alternative "<Alternative>"
    Given member "<Member Name>" can access the member portal
    And the booking utility mode is "ap"
    ...
    And they run the browser booking utility

@bdd @api @bookings @utility @mode:serial
Feature: API booking utility
  ...
  Scenario Outline: API utility manages "<Resource name>" for "<Member Name>" on "<Date>" at "<Start time>" with "<Repeat options>" and alternative "<Alternative>"
    Given member "<Member Name>" can access the member portal
    And the booking utility mode is "api"
    ...
    And they run the API booking utility
```

That split gives the repo a clearer BDD tree:

- `tests/bdd/features/mp`: MP-facing browser features
- `tests/bdd/features/ap`: AP-facing browser features and AP utilities
- `tests/bdd/features/api`: API-only features
- `tests/bdd/steps/mp`: MP-only step definitions
- `tests/bdd/steps/ap`: AP-only step definitions
- `tests/bdd/steps/utility`: shared cross-surface utility step definitions

The example rows cover:

- an MP exact non-repeating booking
- an MP alternative-enabled booking where the requested slot can move to a nearby available time slot
- an AP UI booking that uses the same availability fallback logic before creating the booking through AP
- an API booking that uses the same availability fallback logic before creating the booking through the back-office API

## Member and parameter handling

A booking utility can resolve `Member Name` by:

- matching the configured default MP member if the requested full name is the same user
- then checking optional per-member env vars such as `NEXUDUS_MEMBER_BOB_YOUNGER_EMAIL`
- then falling back to a coworkers API lookup by full display name

The password resolution order can be:

- `NEXUDUS_MEMBER_<DISPLAY_NAME>_PASSWORD` when a per-member override is configured
- `NEXUDUS_MEMBER_DEFAULT_PASSWORD` when set
- otherwise the configured default member password from `NEXUDUS_MEMBER_PASSWORD` or `NEXUDUS_MP_PASSWORD`

The `Mode` parameter behaves like this:

- `mp` mode uses the member-portal UI and the built-in MP repeat control
- `ap` mode uses the AP bookings UI after AP login for both add and delete flows
- `api` mode uses the authenticated back-office API
- in headed or debug runs, only `mp` and `ap` show a visible browser booking flow; `api` runs directly through HTTP calls
- AP mode is the most fragile of the three in practice, because the AP UI is particularly difficult to automate compared with the MP and API surfaces
- for recurring rows in `ap` and `api` mode, the helper expands the requested recurrence into concrete one-time bookings and creates each occurrence individually
- all three modes use the same date, duration, repeat, and alternative-slot business rules from the outline
- `ap` delete mode reuses the cached booking ids from `playwright/.cache/booking-utility-state.json` so the UI cleanup stays exact and stable

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
- `Alternative`: whether the scenario may accept a nearby available time slot instead of failing when the exact requested slot is unavailable

An example `Examples` table inside one of the surface-specific features can look like this:

```gherkin
Examples:
  | Member Name | Resource name         | Date           | Start time | Length     | Repeat options      | Alternative |
  | Bob Younger | Large Meeting Room #1 | next Tuesday   | 9am        | 30 minutes | Does not repeat     | true        |
  | Bob Younger | Large Meeting Room #1 | tomorrow       | 7pm        | 30 minutes | Does not repeat     | false       |
```

For `Every day on <weekday>`, the helper should map that input to the portal's built-in weekly repeat option for the selected weekday, for example `Every week on Monday`. The requested booking date should already fall on that weekday.

Even though the current example rows keep the AP and API cases to single bookings, `ap` and `api` mode can still expand repeat rules into explicit one-time occurrences before creating the bookings, so the resulting booking data still matches the outline even when the utility is not relying on the MP repeat widget.

For `Alternative=true`, the helper applies this fallback rule:

- first keep the same resource and same date, then choose the next available time slot on that day that still fits the requested duration
- if no suitable time slot is available on that day, keep the same resource and then look for the next available day with a bookable slot

If `Alternative=false`, the exact requested slot should be bookable or the scenario should fail.

Delete mode should always prefer the stored booking ids created by the add run. `mp` delete can still fall back to carefully matching active My Activity rows if that state is unavailable, and `api` delete can fall back to careful back-office matching. `ap` delete is intentionally UI-only, so it cancels the stored ids through the AP booking form and fails clearly if the cache is missing. Cancelled rows can remain visible in My Activity, so the MP utility should treat `cancelled or removed` as a successful delete outcome.

If you just want to wipe every tracked booking created by the utility, use `npm run test:bdd:bookings:delete-all`. That script reads [playwright/.cache/booking-utility-state.json](../playwright/.cache/booking-utility-state.json), cancels each stored booking id through the back-office API, prunes successful and already-missing ids from the cache, and also clears the legacy `playwright/.cache/mp-booking-utility-state.json` file so old utility entries do not keep reappearing.

Typical local booking-utility flow:

```bash
# Generate the current BDD specs
npm run test:bdd:gen

# Run the MP booking utility feature
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/mp/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Run the AP booking utility feature
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/ap/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Run the API booking utility feature
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/api/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Run just the delete path for one of those features
NEXUDUS_BDD_BOOKING_ACTION=delete node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts tests/bdd/.features-gen/ap/member-bookings.feature.spec.js --project "MP BDD Chromium" --workers=1

# Or wipe every tracked booking created by earlier utility runs
npm run test:bdd:bookings:delete-all
```

The standalone cleanup script is useful when:

- you have run multiple utility rows over time and just want a clean slate
- an earlier utility run left tracked booking ids behind in the cache
- you want a single reset command before demonstrating the booking utility again

## Meeting-room seed utility

The repo also includes a resource seeding utility for meeting-room style resources. This utility is API-only: it creates resources through the Nexudus back-office API using direct bearer-token authentication instead of clicking through the UI.

Use this utility when you want a serial outline that can:

- create multiple realistic resources from one scenario row
- keep the created ids and generated names in a cache file for exact cleanup later
- support deterministic, on-the-fly theme naming plus an optional preferred CRUD seed without depending on live AI calls
- pair with a standalone cleanup script that removes only the resources previously created by the utility

The meeting-room seed feature lives at [tests/bdd/features/ap/meeting-room-seed-utility.feature](../tests/bdd/features/ap/meeting-room-seed-utility.feature). The generated spec is written to `tests/bdd/.features-gen/ap/meeting-room-seed-utility.feature.spec.js`.

### Local setup

To run the meeting-room seed utility locally, make sure your `.env` has one of these credential sets:

- `NEXUDUS_API_USERNAME` and `NEXUDUS_API_PASSWORD`
- or `NEXUDUS_ADMIN_EMAIL` and `NEXUDUS_ADMIN_PASSWORD`
- or `NEXUDUS_AP_EMAIL` and `NEXUDUS_AP_PASSWORD`

Example commands:

```bash
# Run the add-only seed utility outline locally
# This regenerates the BDD spec first, so edits to the .feature file are picked up.
npm run test:bdd:meeting-room-seed

# Delete every tracked seeded resource from the bulk-cleanup ledger
npm run test:bdd:resources:delete-all
```

Recommended local flow:

1. Edit the `.feature` file row or step definitions.
2. Run `npm run test:bdd:meeting-room-seed` to regenerate and execute the utility.
3. Inspect or use the seeded resources in AP or MP.
4. Run `npm run test:bdd:resources:delete-all` when you want to clean them up.

Because the seed utility is API-only, there is no browser-side flow to step through in headed or debug mode.

### What to edit

The seed utility is driven entirely by the `Examples` row in the feature file. In normal use, you edit one or more rows in [meeting-room-seed-utility.feature](../tests/bdd/features/ap/meeting-room-seed-utility.feature) and then rerun the generated spec.

The current outline columns mean:

- `Resource type`: exact Nexudus resource type name to resolve through the back-office API. This must already exist.
- `Count`: how many resources one row should create.
- `Theme`: optional naming theme such as `harry potter villains` or `great american novelists`.
- `Base`: optional visible base label that appears after the themed part, such as `Meeting Room` or `Room`.
- `Seed`: `true` or `false`. When `true`, the repo's standard CRUD seed suffix and a stable sequence are appended.
- `Visible`: whether the created resources are visible.
- `Requires confirmation`: whether the resource requires booking confirmation.
- `Allocation`: numeric allocation value sent to the Nexudus resource payload.
- `Min booking length`: minimum booking length in minutes. You can use `30` or `30 minutes`.
- `Max booking length`: maximum booking length in minutes. You can use `120` or `2 hours`.
- `Allow multiple bookings`: whether overlapping or multiple bookings are allowed.
- `Hide in calendar`: whether the resource should be hidden from the calendar.
- `Only for members`: whether the resource should be restricted to members.
- `Amenities`: comma-separated amenities such as `Internet, WhiteBoard, LargeDisplay`.

Practical notes:

- If `Seed=true`, the utility can create multiple resources even when `Theme` is blank, because the CRUD seed and sequence keep the names unique.
- If `Seed=false` and `Count` is greater than `1`, set a `Theme` so the generated names stay unique.
- `Resource type` is matched by name through the Nexudus API. The utility does not create missing resource types.
- Cleanup does not come from the feature row. Use `npm run test:bdd:resources:delete-all`.

### Example row

This is the current style of row used by the feature:

```gherkin
Examples:
  | Resource type         | Count | Theme                 | Base  | Seed | Visible | Requires confirmation | Allocation | Min booking length | Max booking length | Allow multiple bookings | Hide in calendar | Only for members | Amenities                                           |
  | Large Meeting Room #1 | 25    | harry potter villains | Room  | true | true    | false                 | 8          | 30                 | 120                | false                   | false            | true             | Internet, WhiteBoard, LargeDisplay, AirConditioning |
```

That row means:

- find the existing resource type `Large Meeting Room #1`
- create 25 resources
- generate the themed part from `harry potter villains`
- append `Room`
- append the repo's preferred CRUD seed suffix and sequence because `Seed=true`
- set the booking and visibility flags in the payload
- mark the listed amenities as `true`

### Naming inputs

The meeting-room utility now builds names from three inputs in a fixed order:

- `Theme`: optional deterministic theme input, for example `harry potter villains`
- `Base`: optional visible base label, for example `Meeting Room`
- `Seed`: `true` or `false`; when `true`, the utility appends the repo's preferred CRUD seed suffix plus a stable sequence such as `2203 1450 shabcde 01`

That means generated names always follow the order `Theme`, then `Base`, then `Seed` when seed is enabled:

- `Lestrange Meeting Room 2203 1450 shabcde 01`
- `Malfoy Meeting Room 2203 1450 shabcde 02`
- `Twain Room 2203 1450 shabcde 01`

The utility does not call a live AI service and does not require a local catalog. `Theme` values are generated on the fly from the text in the scenario row, using a deterministic offline generator so the same theme produces the same sequence of playful names on repeat runs. When a generated themed value contains a full name, the utility prefers the surname where that stays unique; if only a single name is available, it uses that. The generated names still keep the requested order of `Theme`, then `Base`, then `Seed`.

More concrete examples:

- `Theme=harry potter villains`, `Base=Room`, `Seed=true`, `Count=3`
- produces names such as `Lestrange Room 2203 1450 shabcde 01`, `Lucius Room 2203 1450 shabcde 02`, and `Narcissa Room 2203 1450 shabcde 03`

- `Theme=great american novelists`, `Base=Meeting Room`, `Seed=false`, `Count=3`
- produces names such as `Lee Meeting Room`, `Twain Meeting Room`, and `Fitzgerald Meeting Room`

- `Theme=` blank, `Base=Meeting Room`, `Seed=true`, `Count=2`
- produces names such as `Meeting Room 2203 1450 shabcde 01` and `Meeting Room 2203 1450 shabcde 02`

- `Theme=shakespearean character first names`, `Base=Focus Room`, `Seed=false`, `Count=3`
- produces names such as `Viola Focus Room`, `Rosalind Focus Room`, and `Beatrice Focus Room`

### Add and cleanup behavior

Running the seed utility feature does this:

- resolves the authenticated user's default business from the API token context
- resolves `Resource type` by exact name through the back-office API
- generates the requested number of names from `Theme`, `Base`, and `Seed`
- authenticates through the Nexudus back-office API with direct bearer-token credentials
- creates the resources through `POST /api/spaces/resources`
- stores the created ids, generated names, resource type, and request row in `playwright/.cache/resource-seed-state.json`
- also appends each created resource to `playwright/.cache/resource-seed-added-resources.json`, which is the bulk-cleanup ledger for the standalone delete-all script

Cleanup is intentionally separate from the BDD feature. Use `npm run test:bdd:resources:delete-all` when you want to remove the resources created by earlier utility runs. That script does this:

- reads the tracked resource ids from `playwright/.cache/resource-seed-added-resources.json`
- authenticates through the same direct API path
- deletes resources through `DELETE /api/spaces/resources/{id}`
- prunes matching entries from both `playwright/.cache/resource-seed-added-resources.json` and `playwright/.cache/resource-seed-state.json`
- leaves only failed deletions behind for inspection rather than deleting broadly

The BDD meeting-room seed feature itself is add-only, so testers do not need to choose an action in the outline. Seeding happens automatically when the feature runs, and cleanup is handled by the standalone script.

The two local cache files involved are:

- `playwright/.cache/resource-seed-state.json`: per-scenario generated names and created ids
- `playwright/.cache/resource-seed-added-resources.json`: bulk cleanup ledger for the delete-all script

### What to expect after a run

After a successful run:

- the created resource ids and names are written to `playwright/.cache/resource-seed-state.json`
- each individual resource is also written to `playwright/.cache/resource-seed-added-resources.json`
- rerunning the delete-all script removes the tracked resources by id instead of deleting broadly

If something goes wrong:

- the utility fails clearly when the requested `Resource type` does not exist
- the utility fails if generated names would collide with existing resources of the same type in the same business
- the delete-all script leaves failed deletions in the tracking file so they can be inspected and retried

The utility maps the outline columns into the Nexudus resource payload, including business, resource type, visibility, confirmation, allocation, min/max booking lengths, calendar visibility, member-only access, and the supported meeting-room amenities (`Projector`, `Internet`, `ConferencePhone`, `WhiteBoard`, `LargeDisplay`, `VideoConferencing`, `AirConditioning`, `NaturalLight`, and `FlipChart`).
