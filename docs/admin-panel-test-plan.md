# Nexudus Admin Panel Test Plan

Observed on March 14, 2026 by logging into the live demo tenant at `https://dashboard.nexudus.com/` and cross-checking the exposed navigation against the Nexudus help manual.

## Key functionality in the Admin Panel

### Global shell

- Dashboard landing page for daily operational visibility.
- Primary navigation for CRM, Community, Finance, Operations, Inventory, Tasks, Help-desk, Enquiries, and Analytics.
- Global shortcuts for quick-add actions, settings, and AI/help utilities.

### CRM

- Sales pipeline and opportunity tracking through CRM boards and opportunities.
- Proposal management for bundled offers.
- Operational follow-up tools such as reminders, tasks, task lists, documents, message macros, and customer messages.
- Segmentation and marketing insight tooling.

### Community

- Content publishing with articles, FAQs, perks, announcements, and courses.
- Event management through calendar and list views.
- Community interaction through discussion boards and groups.
- Feedback collection through forms, answers, surveys, and virtual rooms.

### Finance

- Invoice and credit-note management.
- Contract lifecycle and contract calendar views.
- Revenue forecasting.
- Accounting support through discount codes and ledgers.

### Operations

- Member/contact administration, teams, and visitors.
- Booking management via calendar, list, and canceled-booking views.
- Check-in and access flows, including customers on site and WiFi access tokens.
- Front-desk workflows such as help-desk messages, departments, and deliveries.

### Inventory

- Product, plan, and pass management.
- Floor plans, floor plan items, and equipment tracking.
- Resource configuration, resource types, and pricing/credit models.

### Tasks, Help-desk, and Enquiries

- Dedicated task queue for operational follow-up.
- Help-desk queue for support requests and routing.
- Enquiry/message list for inbound prospects or contact forms.

### Analytics

- Transactional reports.
- Revenue forecast.
- AI-driven trends such as resource demand, heat-maps, hot-desk demand, churn, and engagement.

## Main workflow test plan

### P0 smoke coverage

- Authentication: invalid login error, valid login redirect, and primary navigation visibility.
- Section integrity: each top-level section should render its key capability cards.
- Core list pages: members and contacts, bookings calendar, bookings list, invoices, tasks, help-desk, and events.
- Safe CRUD: create and delete a product to verify a representative write workflow plus cleanup.

### P1 workflow depth

- Quick add creates customer, booking, invoice, task, and product from the global shortcut.
- Members and contacts: create contact/member variants, search, edit, suspend, and delete in a seeded tenant.
- Bookings: create, edit, check in, and cancel a booking with resource/customer assertions.
- Finance: create draft/issued invoice, inspect activity, and verify ledger impact.
- Tasks: create, assign, complete, reopen, and delete a task.
- Help-desk: open request, assign department/priority/owner, reply, and close.

### P2 extended coverage

- Community authoring: article/announcement/event/form/survey creation and publication rules.
- Inventory depth: plans, passes, resources, floor plans, and pricing rules.
- Analytics: report folder browsing, date filters, location filters, and export/download checks.
- Settings and permissions: location settings, validation rules, and restricted-admin access by role.

## Automated coverage added in this repo

- `tests/nexudus.spec.ts`: invalid login and valid login baseline coverage.
- `tests/admin-panel-overview.spec.ts`: section-level capability smoke coverage.
- `tests/admin-panel-workflows.spec.ts`: core operational list workflows plus strengthened product CRUD and delivery create/assign/delete coverage.

## Known gaps and risks

- Quick add, settings, and AI shortcuts are important but not yet automated because their icon-only affordances are harder to target reliably without more accessibility hooks.
- Community authoring, bookings creation, invoices creation, and task CRUD are better suited to a disposable seeded tenant because they create long-lived records or can trigger downstream billing behavior.
- Analytics report exports and file downloads still need explicit artifact assertions.

## Reference sources

- Admin Panel: https://help.nexudus.com/v3/docs/admin-panel
- Products: https://help.nexudus.com/v3/docs/products
- Bookings: https://help.nexudus.com/docs/bookings
- Creating Bookings: https://help.nexudus.com/v3/docs/creating-bookings
- Tasks: https://help.nexudus.com/v3/docs/tasks
- Help-desk: https://help.nexudus.com/v3/docs/help-desk
- Invoices: https://help.nexudus.com/v3/docs/invoices
- Reports: https://help.nexudus.com/v3/docs/reports
- Adding Contacts: https://help.nexudus.com/v3/docs/adding-contacts
