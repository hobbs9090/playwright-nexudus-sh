import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const playwrightSourceRoot = path.resolve(process.cwd(), 'playwright-report')
const lighthouseSourceRoot = path.resolve(process.cwd(), 'lighthouse-report')
const outputRoot = path.resolve(process.cwd(), 'pages-report')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildCard({ title, href, description, available }) {
  const button = available
    ? `<a class="button" href="${escapeHtml(href)}">Open report</a>`
    : '<span class="button muted">Unavailable</span>'

  return `
    <article class="card ${available ? '' : 'card-muted'}">
      <p class="eyebrow">${available ? 'Available' : 'Unavailable'}</p>
      <h2>${escapeHtml(title)}</h2>
      <p class="lead">${escapeHtml(description)}</p>
      ${button}
    </article>
  `
}

function buildIndexHtml({ hasPlaywrightReport, hasLighthouseReport }) {
  let intro =
    'This published bundle includes both the merged Playwright HTML report for the functional suite and the native Lighthouse HTML reports for the authenticated AP and MP audits.'

  if (hasPlaywrightReport && !hasLighthouseReport) {
    intro =
      'This published bundle includes the merged Playwright HTML report for the Astronomy Night ticket-targeting workflow that runs on CI for this branch.'
  } else if (!hasPlaywrightReport && hasLighthouseReport) {
    intro = 'This published bundle includes the native Lighthouse HTML reports for the authenticated AP and MP audits.'
  } else if (!hasPlaywrightReport && !hasLighthouseReport) {
    intro = 'No HTML reports were published for this run.'
  }

  const cards = [
    buildCard({
      title: 'Playwright Report',
      href: './playwright/',
      description:
        'Merged Playwright HTML report for the functional AP and MP end-to-end suite, including retries, traces, and screenshots.',
      available: hasPlaywrightReport,
    }),
    buildCard({
      title: 'Lighthouse Report',
      href: './lighthouse/',
      description:
        'Authenticated Lighthouse HTML bundle for the AP and MP dashboards, including the native score gauges and audit detail.',
      available: hasLighthouseReport,
    }),
  ].join('\n')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CI Reports</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe8;
        --panel: #fffdf9;
        --ink: #201b17;
        --muted: #6f645b;
        --line: #d9cec3;
        --accent: #0b6d8a;
        --accent-strong: #084d62;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        color: var(--ink);
        font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
        background:
          radial-gradient(circle at top left, rgba(11, 109, 138, 0.12), transparent 28rem),
          linear-gradient(180deg, #f9f5ee 0%, var(--bg) 100%);
      }

      main {
        max-width: 72rem;
        margin: 0 auto;
        padding: 3rem 1.25rem 4rem;
      }

      .hero {
        margin-bottom: 2rem;
        padding: 1.5rem 1.75rem;
        border-radius: 1.25rem;
        border: 1px solid var(--line);
        background: rgba(255, 253, 249, 0.92);
        backdrop-filter: blur(10px);
      }

      h1, h2 { margin: 0; }

      h1 {
        font-size: clamp(2rem, 4vw, 3.2rem);
        line-height: 1;
        letter-spacing: -0.04em;
      }

      .intro {
        max-width: 48rem;
        margin: 0.85rem 0 0;
        color: var(--muted);
        font-size: 1.05rem;
        line-height: 1.6;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
        gap: 1rem;
      }

      .card {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.3rem;
        border-radius: 1.25rem;
        border: 1px solid var(--line);
        background: var(--panel);
        box-shadow: 0 1.1rem 2.2rem rgba(32, 27, 23, 0.08);
      }

      .card-muted {
        opacity: 0.7;
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--accent);
        font: 600 0.72rem/1.2 ui-sans-serif, system-ui, sans-serif;
      }

      .lead {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .button {
        display: inline-flex;
        align-self: start;
        align-items: center;
        justify-content: center;
        padding: 0.72rem 1rem;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        text-decoration: none;
        font: 600 0.92rem/1 ui-sans-serif, system-ui, sans-serif;
      }

      .button:hover {
        background: var(--accent-strong);
      }

      .button.muted {
        background: #d7d0c7;
        color: #5c534c;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>CI Reports</h1>
        <p class="intro">${escapeHtml(intro)}</p>
      </section>
      <section class="grid">
        ${cards}
      </section>
    </main>
  </body>
</html>`
}

async function copyReportDirectory(sourceRoot, destinationRoot) {
  if (!existsSync(sourceRoot)) {
    return false
  }

  await mkdir(path.dirname(destinationRoot), { recursive: true })
  await cp(sourceRoot, destinationRoot, { recursive: true })
  return true
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true })
  await mkdir(outputRoot, { recursive: true })

  const hasPlaywrightReport = await copyReportDirectory(playwrightSourceRoot, path.join(outputRoot, 'playwright'))
  const hasLighthouseReport = await copyReportDirectory(lighthouseSourceRoot, path.join(outputRoot, 'lighthouse'))

  await writeFile(
    path.join(outputRoot, 'index.html'),
    buildIndexHtml({ hasPlaywrightReport, hasLighthouseReport }),
    'utf8',
  )

  console.log(`Built combined CI report site in ${outputRoot}`)
}

await main()
