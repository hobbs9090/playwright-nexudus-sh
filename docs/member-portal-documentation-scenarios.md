# Member Portal Documentation-Derived Scenarios

This inventory maps official Nexudus Members Portal documentation to the current `playwright-nexudus-sh` automation coverage.

## Sources

- Members Portal: https://help.nexudus.com/v3/docs/members-portal
- Accessing Bookings on the Members Portal: https://help.nexudus.com/docs/accessing-bookings-on-the-members-portal
- FAQ Articles: https://help.nexudus.com/docs/faq-articles
- Members Portal Languages: https://help.nexudus.com/v3/docs/members-portal-languages

## Scenario Inventory

| ID | Documentation Basis | Scenario | Coverage |
| --- | --- | --- | --- |
| MP-DOC-01 | Members Portal: the public portal lets visitors sign in. | A visitor can reach the anonymous login page from the public MP home page header sign-in entry point. | Covered by `tests/mp/mp-home-access.spec.ts` |
| MP-DOC-02 | Members Portal: the public portal lets visitors sign in. | A visitor can reach the anonymous login page from the public MP home hero sign-in entry point. | Covered by `tests/mp/mp-public-doc-scenarios.spec.ts` |
| MP-DOC-03 | FAQ Articles: the FAQ page is accessible from the MP footer to anyone visiting the portal. | A public visitor can open the FAQ page from the footer. | Covered by `tests/mp/mp-public-doc-scenarios.spec.ts` |
| MP-DOC-04 | FAQ Articles: logged-in customers can access Support > FAQ. | A signed-in member can open FAQ from the authenticated MP navigation. | Covered by `tests/mp/mp-portal-navigation.spec.ts` |
| MP-DOC-05 | Accessing Bookings on the Members Portal: customers can access the Bookings page on MP. | A signed-in member can reach the Bookings page and see booking filters. | Covered by `tests/mp/mp-portal-navigation.spec.ts` |
| MP-DOC-06 | Members Portal: customers can create an account from the portal. | Individual and company signup flows reach the member dashboard. | Covered by `tests/mp/mp-signup.spec.ts` |
| MP-DOC-07 | Members Portal and FAQ workflows: members can submit support issues from MP. | A signed-in member can create a help request from the support area. | Covered by `tests/mp/mp-help-requests.spec.ts` |
| MP-DOC-08 | Public MP flows: visitors can request tours. | A visitor can submit a tour request from the public login flow. | Covered by `tests/mp/mp-tour.spec.ts` |
| MP-DOC-09 | Members Portal Languages: version 4 users can change the portal language from the footer. | The footer language selector can switch to another supported language. | Covered by `tests/api/mp-footer-and-social.spec.ts` |
| MP-DOC-10 | Accessing Bookings on the Members Portal: members with planned bookings can use Manage bookings from the dashboard. | The authenticated dashboard exposes the Manage bookings CTA when seeded booking data exists. | Candidate for future automation; requires deterministic booking seed data |
