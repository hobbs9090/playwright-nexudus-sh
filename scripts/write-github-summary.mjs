import { appendFileSync, existsSync, readFileSync } from 'node:fs'

const summaryPath = process.env.GITHUB_STEP_SUMMARY

if (!summaryPath) {
  process.exit(0)
}

const junitPath = process.env.PLAYWRIGHT_JUNIT_PATH || 'test-results/results.xml'
const pagesUrl = process.env.PLAYWRIGHT_REPORT_URL || ''
const runUrl = [
  process.env.GITHUB_SERVER_URL,
  process.env.GITHUB_REPOSITORY,
  process.env.GITHUB_RUN_ID,
].every(Boolean)
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : ''

function parseAttributes(fragment) {
  return Object.fromEntries([...fragment.matchAll(/(\w+)="([^"]*)"/g)].map(([, key, value]) => [key, value]))
}

function parseJUnitReport(xml) {
  const rootMatch = xml.match(/<(testsuites|testsuite)\b([^>]*)>/)
  const rootAttributes = parseAttributes(rootMatch?.[2] || '')
  const total = Number.parseInt(rootAttributes.tests || '0', 10)
  const skipped = Number.parseInt(rootAttributes.skipped || '0', 10)
  const failures = Number.parseInt(rootAttributes.failures || '0', 10) + Number.parseInt(rootAttributes.errors || '0', 10)
  const passed = Math.max(0, total - skipped - failures)
  const durationSeconds = Number.parseFloat(rootAttributes.time || '0')
  const failedTests = []

  const testCasePattern = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g

  for (const match of xml.matchAll(testCasePattern)) {
    const attributes = parseAttributes(match[1] || '')
    const body = match[2] || ''
    const failed = body.includes('<failure') || body.includes('<error')

    if (!failed) {
      continue
    }

    const className = attributes.classname || 'Playwright'
    const testName = attributes.name || 'Unnamed test'
    failedTests.push(`${className} - ${testName}`)
  }

  return {
    durationSeconds,
    failedTests,
    failures,
    passed,
    skipped,
    total,
  }
}

const lines = ['## Playwright Results', '']

if (existsSync(junitPath)) {
  const report = parseJUnitReport(readFileSync(junitPath, 'utf8'))

  lines.push('| Total | Passed | Failed | Skipped | Duration |')
  lines.push('| --- | --- | --- | --- | --- |')
  lines.push(
    `| ${report.total} | ${report.passed} | ${report.failures} | ${report.skipped} | ${report.durationSeconds.toFixed(1)}s |`
  )
  lines.push('')

  if (report.failedTests.length > 0) {
    lines.push('### Failed Tests')
    lines.push('')

    for (const failedTest of report.failedTests.slice(0, 10)) {
      lines.push(`- ${failedTest}`)
    }

    if (report.failedTests.length > 10) {
      lines.push(`- ...and ${report.failedTests.length - 10} more`)
    }

    lines.push('')
  }
} else {
  lines.push(`No JUnit report was found at \`${junitPath}\`.`)
  lines.push('')
}

if (runUrl) {
  lines.push(`Artifacts and logs: [View this workflow run](${runUrl})`)
}

if (pagesUrl) {
  lines.push(`HTML report: [Open published Playwright report](${pagesUrl})`)
} else {
  lines.push('HTML report: uploaded as the `playwright-report` artifact on this run.')
}

lines.push('')

appendFileSync(summaryPath, `${lines.join('\n')}\n`)
