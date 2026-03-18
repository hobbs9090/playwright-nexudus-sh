import { mkdir, copyFile, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const sourceRoot = path.resolve(process.cwd(), 'test-results', 'lighthouse')
const outputRoot = path.resolve(process.cwd(), 'lighthouse-report')

async function findFiles(rootDir, predicate, matches = []) {
  const entries = await import('node:fs/promises').then(({ readdir }) => readdir(rootDir, { withFileTypes: true }))

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      await findFiles(entryPath, predicate, matches)
      continue
    }

    if (predicate(entryPath)) {
      matches.push(entryPath)
    }
  }

  return matches
}

function toPercent(score) {
  return typeof score === 'number' ? Math.round(score * 100) : null
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatScore(score) {
  return typeof score === 'number' ? `${score}` : 'n/a'
}

function formatTimestamp(value) {
  if (!value) {
    return 'Unknown'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString().replace('T', ' ').replace('Z', ' UTC')
}

function buildIndexHtml(reports) {
  const cards = reports
    .map((report) => {
      const finalUrl = escapeHtml(report.finalUrl || report.requestedUrl || 'Unknown URL')
      const label = escapeHtml(report.label)
      const htmlPath = escapeHtml(`./${report.slug}.html`)
      const jsonPath = escapeHtml(`./${report.slug}.json`)

      return `
        <article class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">${label}</p>
              <h2>${escapeHtml(report.title)}</h2>
            </div>
            <a class="button" href="${htmlPath}">Open report</a>
          </div>
          <p class="url">${finalUrl}</p>
          <dl class="scores">
            <div>
              <dt>Performance</dt>
              <dd>${formatScore(report.performance)}</dd>
            </div>
            <div>
              <dt>Accessibility</dt>
              <dd>${formatScore(report.accessibility)}</dd>
            </div>
            <div>
              <dt>Best Practices</dt>
              <dd>${formatScore(report.bestPractices)}</dd>
            </div>
          </dl>
          <p class="meta">Generated ${escapeHtml(formatTimestamp(report.fetchTime))}</p>
          <p class="meta"><a href="${jsonPath}">View JSON</a></p>
        </article>
      `
    })
    .join('\n')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lighthouse Reports</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe6;
        --panel: #fffdf8;
        --ink: #1f1a16;
        --muted: #6e6157;
        --line: #d9cec2;
        --accent: #0a7c66;
        --accent-strong: #075848;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
        background:
          radial-gradient(circle at top left, rgba(10, 124, 102, 0.12), transparent 28rem),
          linear-gradient(180deg, #f7f2ea 0%, var(--bg) 100%);
        color: var(--ink);
      }

      main {
        max-width: 68rem;
        margin: 0 auto;
        padding: 3rem 1.25rem 4rem;
      }

      .hero {
        margin-bottom: 2rem;
        padding: 1.5rem 1.75rem;
        border: 1px solid var(--line);
        border-radius: 1.25rem;
        background: rgba(255, 253, 248, 0.9);
        backdrop-filter: blur(10px);
      }

      h1, h2 { margin: 0; }
      h1 {
        font-size: clamp(2rem, 4vw, 3.25rem);
        line-height: 1;
        letter-spacing: -0.04em;
      }

      .lead, .meta, .url {
        color: var(--muted);
      }

      .lead {
        max-width: 52rem;
        margin: 0.75rem 0 0;
        font-size: 1.05rem;
        line-height: 1.6;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
        gap: 1rem;
      }

      .card {
        border: 1px solid var(--line);
        border-radius: 1.25rem;
        padding: 1.25rem;
        background: var(--panel);
        box-shadow: 0 1.25rem 2.5rem rgba(31, 26, 22, 0.08);
      }

      .card-head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: start;
      }

      .eyebrow {
        margin: 0 0 0.4rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font: 600 0.72rem/1.2 ui-sans-serif, system-ui, sans-serif;
        color: var(--accent);
      }

      .button {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.7rem 0.95rem;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        text-decoration: none;
        font: 600 0.92rem/1 ui-sans-serif, system-ui, sans-serif;
      }

      .button:hover {
        background: var(--accent-strong);
      }

      .url {
        margin: 0.9rem 0 1rem;
        word-break: break-word;
        font: 0.95rem/1.5 ui-monospace, SFMono-Regular, monospace;
      }

      .scores {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
        margin: 0 0 1rem;
      }

      .scores div {
        padding: 0.85rem 0.75rem;
        border-radius: 0.9rem;
        background: #f2eee7;
      }

      dt {
        margin: 0 0 0.25rem;
        color: var(--muted);
        font: 600 0.72rem/1.2 ui-sans-serif, system-ui, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      dd {
        margin: 0;
        font: 700 1.8rem/1 ui-sans-serif, system-ui, sans-serif;
      }

      a {
        color: var(--accent-strong);
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>Lighthouse Reports</h1>
        <p class="lead">Native Lighthouse HTML reports from the authenticated AP and MP audits. Open either report below to see the full Lighthouse gauges, opportunities, diagnostics, and audit detail.</p>
      </section>
      <section class="grid">
        ${cards}
      </section>
    </main>
  </body>
</html>`
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true })
  await mkdir(outputRoot, { recursive: true })

  if (!existsSync(sourceRoot)) {
    await writeFile(
      path.join(outputRoot, 'index.html'),
      '<!doctype html><html lang="en"><body><h1>No Lighthouse reports found.</h1></body></html>',
      'utf8',
    )
    console.log(`No Lighthouse results found under ${sourceRoot}.`)
    return
  }

  const jsonFiles = await findFiles(
    sourceRoot,
    (filePath) => filePath.endsWith('.json') && filePath.includes(`${path.sep}lighthouse${path.sep}`),
  )
  const candidates = []

  for (const jsonFile of jsonFiles) {
    const htmlFile = jsonFile.replace(/\.json$/u, '.html')

    if (!existsSync(htmlFile)) {
      continue
    }

    const rawJson = await readFile(jsonFile, 'utf8')
    const parsed = JSON.parse(rawJson)
    const slug = path.basename(jsonFile, '.json')
    const title = slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

    candidates.push({
      slug,
      label: slug.startsWith('ap-') ? 'AP' : slug.startsWith('mp-') ? 'MP' : 'Audit',
      title,
      htmlFile,
      jsonFile,
      fetchTime: parsed.fetchTime || '',
      requestedUrl: parsed.requestedUrl || '',
      finalUrl: parsed.finalUrl || '',
      performance: toPercent(parsed?.categories?.performance?.score),
      accessibility: toPercent(parsed?.categories?.accessibility?.score),
      bestPractices: toPercent(parsed?.categories?.['best-practices']?.score),
    })
  }

  const latestReports = new Map()

  for (const candidate of candidates) {
    const existing = latestReports.get(candidate.slug)

    if (!existing || candidate.fetchTime > existing.fetchTime) {
      latestReports.set(candidate.slug, candidate)
    }
  }

  const reports = [...latestReports.values()].sort((left, right) => left.slug.localeCompare(right.slug))

  for (const report of reports) {
    await copyFile(report.htmlFile, path.join(outputRoot, `${report.slug}.html`))
    await copyFile(report.jsonFile, path.join(outputRoot, `${report.slug}.json`))
  }

  await writeFile(path.join(outputRoot, 'index.html'), buildIndexHtml(reports), 'utf8')
  console.log(`Built Lighthouse report bundle in ${outputRoot}`)
}

await main()
