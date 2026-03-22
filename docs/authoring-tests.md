# Authoring tests

[Repository README](../README.md) | [Docs index](README.md) | [Getting started](getting-started.md) | [Configuration](configuration.md) | [CI](ci.md) | [Running tests](running-tests.md) | [BDD tests](bdd-tests.md) | [Testing utilities](testing-utilities.md) | [Lighthouse and performance](lighthouse-performance-ci.md)

## Working with Codex

If you want to use Codex with this repository:

- Codex is optional. The suite can be run and maintained without it
- ChatGPT Free or lighter usage tiers can be restrictive for longer Codex sessions, especially when the work involves reading a lot of files, running tests repeatedly, or fixing CI issues
- A paid plan such as ChatGPT Pro is often more practical for sustained repo work, but plan limits and availability can change over time
- Even on paid plans, focused prompts help because larger exploratory tasks can consume allowance quickly

## Adding tests with AI

AI tools such as Codex can usually produce a useful first pass from a short prompt. For example:

```text
Create an AP test that sets up a complete published course
with lessons, images, and enrolments, following the existing patterns.
```

That said, more detail will usually produce output that is much closer to what you actually want.

When asking AI to add a test, it helps to specify:

- which area the test belongs to: `AP`, `MP`, or `API`
- the exact workflow or business behavior to cover
- any required names, titles, settings, images, participants, or seeded data
- whether the AI should choose sensible defaults when you do not care about the exact values
- where the code should live, for example `tests/ap`, `page-objects/ap`, or `api`
- whether existing page objects, config helpers, or API clients should be reused
- how the flow should be verified locally
- whether the work should be split into logical commits and pushed

The current AP course-creation workflow in [course-workflows.spec.ts](../tests/ap/course-workflows.spec.ts) was created from a more detailed prompt. The requirements below are the example instructions that were used to create that last test:

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

- a new AP end-to-end workflow in [course-workflows.spec.ts](../tests/ap/course-workflows.spec.ts)
- supporting AP page-object behavior in [CoursePage.ts](../page-objects/ap/CoursePage.ts)
- reusable API client helpers in [NexudusApiClient.ts](../api/NexudusApiClient.ts) for reading courses, updating courses, creating sections, creating lessons, listing coworkers, and enrolling members
- two reusable AI-generated image fixtures under [tests/fixtures](../tests/fixtures/)
- seeded course-title generation rather than a fixed title
- sensible lesson titles and topics, including details like `Lambeth Overpiping`, which turned out to be a real cake-decorating technique rather than a made-up phrase. See [Joseph Lambeth](https://en.wikipedia.org/wiki/Joseph_Lambeth)
- appropriate course summary, description, overview, section summaries, and lesson content that matched the subject matter
- a mixed UI and API setup flow, with the UI used for course creation and image upload, and the API used for richer course configuration and lesson/member setup
- verification that the course was published, public, available in all locations, featured after login, and configured with a discussion-board group
- verification that all three sections, all eight lessons, and three enrolled participants were present
- local test execution, failure diagnosis, fixes, reruns, logical commits, and push-ready output
- even knew to create this rather fabulous [large course image](../tests/fixtures/ap-course-cake-decorations-large.png)

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

For MP coverage planning based on official product docs, see [Member Portal documentation-derived scenarios](member-portal-documentation-scenarios.md).
