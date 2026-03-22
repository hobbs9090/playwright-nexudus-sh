# Testing utilities

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Authoring tests](authoring-tests.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Gremlins](gremlins.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

Use this page for utility-style test flows that help create or clean up manual test data without turning those scenarios into normal CI assertions. A good fit for this repo is a booking utility outline that can add realistic MP or AP booking data before a manual test session and remove it again afterwards.

Testing utilities are best used to save time during manual testing:

- create realistic booking data quickly through either the MP portal or AP
- verify a path with known bookings in place
- remove those same bookings later without repeating the work manually in the UI

Utilities in this repo should be clearly opt-in:

- tag them `@utility` so they stand out in reports
- keep them serial when rows could compete for shared data
- keep them out of CI by default; the BDD config excludes `@utility` scenarios when `CI=true`
- prefer explicit add and delete modes when the utility really needs both paths, or a dedicated cleanup script when an add-only utility flow is simpler and safer

A booking utility pattern is mainly controlled by one optional env var plus a `Mode` column in the outline. The env var is also documented in [`.env.example`](../.env.example):

- `add`: create the bookings described by the `Examples` rows and leave them in place for manual testing
- `delete`: cancel the booking ids stored by the most recent add run for the same example rows
- unset: use the default `add` mode

- `Mode=mp`: run that example row through the member-portal flow and MP UI assertions
- `Mode=ap`: run that example row through the authenticated AP back-office API
- `NEXUDUS_BDD_BOOKING_MODE`: optional fallback default only if a utility scenario omits the mode step entirely; the current feature file sets mode per row in Gherkin

## Example utility commands

```bash
# Add the example bookings and leave them in place.
# Replace <generated-utility-spec> with the generated Playwright spec for the utility feature.
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts <generated-utility-spec> --project "MP BDD Chromium" --workers=1

# Delete the bookings created by the most recent add run for the same rows
NEXUDUS_BDD_BOOKING_ACTION=delete node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts <generated-utility-spec> --project "MP BDD Chromium" --workers=1

# Run the utility in headed mode if you want to watch it
node scripts/run-with-dotenv.mjs -- npx playwright test -c playwright.bdd.config.ts <generated-utility-spec> --project "MP BDD Chromium" --workers=1 --headed
```

A booking utility should store created ids in a small cache file so the later `delete` run can remove those same records instead of matching broadly against every similar booking. If that stored state is missing, delete mode should fall back to carefully matching active records that still fit the same example row.

## Example utility outline

The pattern below works well for a serial booking utility outline, with the booking path chosen directly in Gherkin:

```gherkin
@bdd @mp @ap @bookings @utility @mode:serial
Feature: Booking utility
  As a tester
  I want to add or delete booking data from example rows through MP or AP
  So that I can prepare or remove manual test data quickly

  Background:
    Given the booking utility configuration is ready

  Scenario Outline: utility uses "<Mode>" to manage "<Resource name>" for "<Member Name>" on "<Date>" at "<Start time>" with "<Repeat options>" and alternative "<Alternative>"
    Given member "<Member Name>" can access the member portal
    And the booking utility mode is "<Mode>"
    When they prepare a booking utility request for "<Resource name>"
    And the requested date is "<Date>"
    And the requested start time is "<Start time>"
    And the requested length is "<Length>"
    And the requested repeat option is "<Repeat options>"
    And alternative booking is "<Alternative>"
    And they run the booking utility
    Then the booking utility should finish successfully
```

The example rows cover:

- an exact non-repeating booking
- an alternative-enabled booking where the requested slot can move to a nearby available time slot
- a workday recurrence
- a weekly weekday recurrence

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
- `ap` mode uses the authenticated AP back-office API
- for recurring rows in `ap` mode, the helper expands the requested recurrence into concrete one-time bookings and creates each occurrence individually
- both modes use the same date, duration, repeat, and alternative-slot business rules from the outline

The utility supports these scenario outline parameters:

- `Date`: `dd/mm/yyyy`, `today`, `tomorrow`, and `next <weekday>`
- `Start time`: values such as `09:00`, `9am`, and `2:30pm`
- `Length`: values such as `30 minutes`, `1 hour`, `2 hours`, and `90 minutes`
- `Repeat options`: `Does not repeat`, `Every workday`, and `Every day on <weekday>`
- `Alternative`: `true/false` or `yes/no`

The scenario outline parameters mean:

- `Member Name`: full member display name as it appears in Nexudus, for example `Bob Younger`
- `Mode`: whether that row uses the MP portal path or the AP back-office API path
- `Resource name`: exact MP resource label, for example `Large Meeting Room #1`
- `Date`: the requested booking date in exact or natural-language form
- `Start time`: the requested start time for the booking window
- `Length`: the requested booking duration
- `Repeat options`: how the booking should recur in the MP repeat control
- `Alternative`: whether the scenario may accept a nearby available time slot instead of failing when the exact requested slot is unavailable

An example `Examples` table can look like this:

```gherkin
Examples:
  | Member Name | Mode | Resource name         | Date           | Start time | Length     | Repeat options      | Alternative |
  | Bob Younger | mp   | Large Meeting Room #1 | next Tuesday   | 9am        | 30 minutes | Does not repeat     | true        |
  | Bob Younger | mp   | Large Meeting Room #1 | tomorrow       | 7pm        | 30 minutes | Does not repeat     | false       |
  | Bob Younger | ap   | Large Meeting Room #1 | next Wednesday | 7pm        | 30 minutes | Every workday       | false       |
  | Bob Younger | ap   | Large Meeting Room #1 | 23/03/2026     | 7:30pm     | 30 minutes | Every day on Monday | false       |
```

For `Every day on <weekday>`, the helper should map that input to the portal's built-in weekly repeat option for the selected weekday, for example `Every week on Monday`. The requested booking date should already fall on that weekday.

In `ap` mode, the same repeat rule can be expanded into explicit one-time occurrences before calling the back-office API, so the resulting booking data still matches the outline even though it is not using the MP repeat widget.

For `Alternative=true`, the helper applies this fallback rule:

- first keep the same resource and same date, then choose the next available time slot on that day that still fits the requested duration
- if no suitable time slot is available on that day, keep the same resource and then look for the next available day with a bookable slot

If `Alternative=false`, the exact requested slot should be bookable or the scenario should fail.

Delete mode should prefer API cancellation rather than UI clicks. Cancelled rows can remain visible in My Activity, so the utility should treat `cancelled or removed` as a successful delete outcome. Delete mode should prefer the stored booking ids created by the add run, and only fall back to matching active bookings when that stored state is unavailable.

## Meeting-room seed utility

The repo also includes an AP-focused resource seeding utility for meeting-room style resources. This utility is API-driven after authentication: it signs into AP to capture the back-office bearer token, then creates resources through the Nexudus back-office API instead of clicking through the UI.

Use this utility when you want a serial outline that can:

- create multiple realistic resources from one scenario row
- keep the created ids and generated names in a cache file for exact cleanup later
- support deterministic, on-the-fly theme naming plus an optional preferred CRUD seed without depending on live AI calls
- pair with a standalone cleanup script that removes only the resources previously created by the utility

The meeting-room seed feature lives at [tests/bdd/features/ap/meeting-room-seed-utility.feature](../tests/bdd/features/ap/meeting-room-seed-utility.feature). The generated spec is written to `tests/bdd/.features-gen/ap/meeting-room-seed-utility.feature.spec.js`.

### Local setup

To run the meeting-room seed utility locally, make sure your `.env` has AP credentials and a valid staging location label:

- `NEXUDUS_AP_EMAIL`
- `NEXUDUS_AP_PASSWORD`
- `NEXUDUS_AP_LOCATION_SELECTOR_LABEL`
- optionally `NEXUDUS_AP_BASE_URL` if you are not using the default staging dashboard

The add-only utility feature and the cleanup script both log into AP, so they use the same AP credentials and location selection settings.

Example commands:

```bash
# Run the add-only seed utility outline locally
# This regenerates the BDD spec first, so edits to the .feature file are picked up.
npm run test:bdd:meeting-room-seed

# Run the same utility in headed mode if you want to watch AP login and seeding
npm run test:bdd:meeting-room-seed:headed

# Delete every tracked seeded resource from the bulk-cleanup ledger
npm run test:bdd:resources:delete-all
```

Recommended local flow:

1. Edit the `.feature` file row or step definitions.
2. Run `npm run test:bdd:meeting-room-seed` to regenerate and execute the utility.
3. Inspect or use the seeded resources in AP or MP.
4. Run `npm run test:bdd:resources:delete-all` when you want to clean them up.

### What to edit

The seed utility is driven entirely by the `Examples` row in the feature file. In normal use, you edit one or more rows in [meeting-room-seed-utility.feature](../tests/bdd/features/ap/meeting-room-seed-utility.feature) and then rerun the generated spec.

The current outline columns mean:

- `Business`: optional AP business name. Leave it blank to use the authenticated AP user's default business.
- `Resource type`: exact Nexudus resource type name to resolve through the back-office API. This must already exist.
- `Count`: how many resources one row should create.
- `Theme`: optional naming theme such as `harry potter villains` or `great american novelists`.
- `Base`: optional visible base label that appears after the themed part, such as `Meeting Room` or `RoomX`.
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
  | Business | Resource type         | Count | Theme                 | Base  | Seed | Visible | Requires confirmation | Allocation | Min booking length | Max booking length | Allow multiple bookings | Hide in calendar | Only for members | Amenities                                           |
  |          | Large Meeting Room #1 | 25    | harry potter villains | RoomX | true | true    | false                 | 8          | 30                 | 120                | false                   | false            | true             | Internet, WhiteBoard, LargeDisplay, AirConditioning |
```

That row means:

- use the authenticated AP user's default business
- find the existing resource type `Large Meeting Room #1`
- create 25 resources
- generate the themed part from `harry potter villains`
- append `RoomX`
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
- `Twain RoomX 2203 1450 shabcde 01`

The utility does not call a live AI service and does not require a local catalog. `Theme` values are generated on the fly from the text in the scenario row, using a deterministic offline generator so the same theme produces the same sequence of playful names on repeat runs. When a generated themed value contains a full name, the utility prefers the surname where that stays unique; if only a single name is available, it uses that. The generated names still keep the requested order of `Theme`, then `Base`, then `Seed`.

More concrete examples:

- `Theme=harry potter villains`, `Base=RoomX`, `Seed=true`, `Count=3`
- produces names such as `Lestrange RoomX 2203 1450 shabcde 01`, `Lucius RoomX 2203 1450 shabcde 02`, and `Narcissa RoomX 2203 1450 shabcde 03`

- `Theme=great american novelists`, `Base=Meeting Room`, `Seed=false`, `Count=3`
- produces names such as `Lee Meeting Room`, `Twain Meeting Room`, and `Fitzgerald Meeting Room`

- `Theme=` blank, `Base=Meeting Room`, `Seed=true`, `Count=2`
- produces names such as `Meeting Room 2203 1450 shabcde 01` and `Meeting Room 2203 1450 shabcde 02`

- `Theme=shakespearean character first names`, `Base=Focus Room`, `Seed=false`, `Count=3`
- produces names such as `Viola Focus Room`, `Rosalind Focus Room`, and `Beatrice Focus Room`

### Add and cleanup behavior

Running the seed utility feature does this:

- resolves the requested AP business, defaulting to the authenticated AP business when `Business` is blank
- resolves `Resource type` by exact name through the back-office API
- generates the requested number of names from `Theme`, `Base`, and `Seed`
- creates the resources through `POST /api/spaces/resources`
- stores the created ids, generated names, resource type, and request row in `playwright/.cache/resource-seed-state.json`
- also appends each created resource to `playwright/.cache/resource-seed-added-resources.json`, which is the bulk-cleanup ledger for the standalone delete-all script

Cleanup is intentionally separate from the BDD feature. Use `npm run test:bdd:resources:delete-all` when you want to remove the resources created by earlier utility runs. That script does this:

- reads the tracked resource ids from `playwright/.cache/resource-seed-added-resources.json`
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
