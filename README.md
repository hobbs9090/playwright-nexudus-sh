# playwright-nexudus

Demonstration of automation test suite for Nexudus using Playwright. The framework is written in TypeScript and uses Mocha as the test runner. It utilises a page object model to abstract the page interactions and make the tests more readable.

The tests are run in headed mode by default, but can be run in headless mode by setting the `headless` environment variable to `true` in `playwright.config.ts`. The number of workers can be set by adjusting the `workers` environment variable to the desired number of workers and by default is the number of CPU logical cores on the host machine divided by 2. Screenshots and video are taken for all tests regardless of result and stored in the `test-results` directory.

Reports are stored in the `playwright-report` directory. The reporting format is set to HTML by default but can be changed by setting the `reporter` environment variable to the desired reporter. Where applicable the report contains details of the test product names created as these are unique and contain a timestamp for easy identification. i.e. `TestProduct 1510 0930 hmltk` where `1510` is the date (DDMM) and `0930` is the time (hhmm). The `hmltk` is a random string to ensure uniqueness. An example of report from previous run can be found in the folder `playwright-report-example`.

For the purposes of demonstration, I've just configured the suite to run in Chromium and Firefox browsers, but again, this can be changed in the `playwright.config.ts` file.

Note that as this is a shared private repository, I have included the email and password of the test user embeded in the code. This is not something I would normally do, but as this is a demonstration, I have done so for convenience.

## Prerequisites

- [Node.js](https://nodejs.org/) and NPM
- [Playwright](https://playwright.dev/)

## Installation

```bash
# Clone the repository
git clone https://github.com/hobbs901/playwright-nexudus/

# Navigate into the directory
cd playwright-nexudus

# Install dependencies
npm install

# Install Playwright
npm install playwright

# Install Playwright Chromium
npx playwright install chromium

# Install Playwright Firefox
npx playwright install firefox
```

## Usage

```bash
# Run the node script to run the tests
npx playwright test

# View the report
npx playwright show-report
```
