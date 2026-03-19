import { execSync } from 'node:child_process'

const defaultTargetMinutes = 5
const defaultFixedOverheadMinutes = 1.25
const defaultMaxShardsPerProject = 4
const defaultBranch = getStringEnvVar('GITHUB_DEFAULT_BRANCH', 'main')
const currentBranch = getStringEnvVar('GITHUB_REF_NAME', '')
const comparisonBaseBranch = getStringEnvVar('GITHUB_BASE_REF', defaultBranch)
const branchMode = currentBranch && currentBranch !== defaultBranch ? 'changed-tests' : 'full-suite'

const projectPlans = [
  {
    estimatedSerialMinutes: getNumericEnvVar('PLAYWRIGHT_CI_AP_SERIAL_MINUTES', 9.75),
    project: 'AP Chromium',
    shardOverride: getOptionalIntegerEnvVar('PLAYWRIGHT_CI_AP_SHARDS'),
    slug: 'ap',
  },
  {
    estimatedSerialMinutes: getNumericEnvVar('PLAYWRIGHT_CI_MP_SERIAL_MINUTES', 2),
    project: 'MP Staging Chromium',
    shardOverride: getOptionalIntegerEnvVar('PLAYWRIGHT_CI_MP_SHARDS'),
    slug: 'mp',
  },
  {
    estimatedSerialMinutes: getNumericEnvVar('PLAYWRIGHT_CI_API_SERIAL_MINUTES', 1),
    project: 'API',
    shardOverride: getOptionalIntegerEnvVar('PLAYWRIGHT_CI_API_SHARDS'),
    slug: 'api',
  },
]

const changedSpecFiles = branchMode === 'changed-tests' ? getChangedSpecFiles(comparisonBaseBranch) : []
const changedPlaywrightSpecs = changedSpecFiles.filter(isPlaywrightSpec)
const changedLighthouseSpecs = changedSpecFiles.filter(isLighthouseSpec)
const matrix =
  branchMode === 'changed-tests'
    ? changedPlaywrightSpecs.map((specFile) => buildChangedTestMatrixEntry(specFile))
    : buildFullSuiteMatrix()
const targetMinutes =
  branchMode === 'changed-tests'
    ? matrix.length > 0
      ? 1
      : 0
    : getNumericEnvVar('PLAYWRIGHT_CI_TARGET_MINUTES', defaultTargetMinutes)
const fixedOverheadMinutes =
  branchMode === 'changed-tests' ? 0 : getNumericEnvVar('PLAYWRIGHT_CI_FIXED_OVERHEAD_MINUTES', defaultFixedOverheadMinutes)
const executionBudgetMinutes =
  branchMode === 'changed-tests' ? (matrix.length > 0 ? 1 : 0) : Math.max(1, targetMinutes - fixedOverheadMinutes)
const runLighthouse = branchMode === 'full-suite' || changedLighthouseSpecs.length > 0
const runPlaywright = matrix.length > 0
const publishReports = runPlaywright || runLighthouse

const outputs = {
  branch_mode: branchMode,
  comparison_base_branch: comparisonBaseBranch,
  execution_budget_minutes: executionBudgetMinutes,
  lighthouse_test_targets: changedLighthouseSpecs.join(' '),
  matrix,
  publish_reports: publishReports,
  run_lighthouse: runLighthouse,
  run_playwright: runPlaywright,
  target_minutes: targetMinutes,
  total_runners: matrix.length,
}

process.stdout.write(`branch_mode=${branchMode}\n`)
process.stdout.write(`comparison_base_branch=${comparisonBaseBranch}\n`)
process.stdout.write(`matrix=${JSON.stringify(matrix)}\n`)
process.stdout.write(`target_minutes=${targetMinutes}\n`)
process.stdout.write(`execution_budget_minutes=${executionBudgetMinutes}\n`)
process.stdout.write(`run_playwright=${runPlaywright}\n`)
process.stdout.write(`run_lighthouse=${runLighthouse}\n`)
process.stdout.write(`publish_reports=${publishReports}\n`)
process.stdout.write(`lighthouse_test_targets=${changedLighthouseSpecs.join(' ')}\n`)
process.stdout.write(`total_runners=${matrix.length}\n`)
process.stderr.write(`Playwright CI matrix: ${JSON.stringify(outputs, null, 2)}\n`)

function buildFullSuiteMatrix() {
  const targetMinutes = getNumericEnvVar('PLAYWRIGHT_CI_TARGET_MINUTES', defaultTargetMinutes)
  const fixedOverheadMinutes = getNumericEnvVar('PLAYWRIGHT_CI_FIXED_OVERHEAD_MINUTES', defaultFixedOverheadMinutes)
  const maxShardsPerProject = getIntegerEnvVar('PLAYWRIGHT_CI_MAX_SHARDS_PER_PROJECT', defaultMaxShardsPerProject)
  const executionBudgetMinutes = Math.max(1, targetMinutes - fixedOverheadMinutes)
  const matrix = []

  for (const projectPlan of projectPlans) {
    const shardTotal = clampShardCount(
      projectPlan.shardOverride ?? Math.ceil(projectPlan.estimatedSerialMinutes / executionBudgetMinutes),
      maxShardsPerProject,
    )

    for (let shardIndex = 1; shardIndex <= shardTotal; shardIndex += 1) {
      matrix.push({
        artifact_suffix: `${shardIndex}-of-${shardTotal}`,
        job_label: `${shardIndex}/${shardTotal}`,
        project: projectPlan.project,
        project_slug: projectPlan.slug,
        shard_index: shardIndex,
        shard_total: shardTotal,
      })
    }
  }

  return matrix
}

function buildChangedTestMatrixEntry(specFile) {
  const { project, slug } = getPlaywrightProjectForSpec(specFile)

  return {
    artifact_suffix: normalizeFileSlug(specFile),
    job_label: normalizeFileSlug(specFile),
    project,
    project_slug: slug,
    shard_index: 1,
    shard_total: 1,
    test_slug: normalizeFileSlug(specFile),
    test_target: specFile,
  }
}

function clampShardCount(value, maxShardsPerProject) {
  const normalizedValue = Number.isFinite(value) ? Math.floor(value) : 1
  return Math.max(1, Math.min(maxShardsPerProject, normalizedValue))
}

function getChangedSpecFiles(baseBranch) {
  const diffRange = `origin/${baseBranch}...HEAD`
  const changedFilesOutput = execSync(`git diff --name-only --diff-filter=ACMR ${diffRange} -- tests`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

  if (!changedFilesOutput) {
    return []
  }

  return changedFilesOutput
    .split('\n')
    .map((filePath) => filePath.trim())
    .filter((filePath) => filePath.endsWith('.spec.ts'))
}

function getPlaywrightProjectForSpec(specFile) {
  if (specFile.startsWith('tests/ap/')) {
    return {
      project: 'AP Chromium',
      slug: 'ap',
    }
  }

  if (specFile.startsWith('tests/mp/')) {
    return {
      project: 'MP Staging Chromium',
      slug: 'mp',
    }
  }

  if (specFile.startsWith('tests/api/')) {
    return {
      project: 'API',
      slug: 'api',
    }
  }

  throw new Error(`Could not map changed spec "${specFile}" to a Playwright project.`)
}

function isLighthouseSpec(specFile) {
  return /^tests\/lighthouse\/(?:ap|mp)\/.+\.spec\.ts$/.test(specFile)
}

function isPlaywrightSpec(specFile) {
  return /^tests\/(?:ap|mp|api)\/.+\.spec\.ts$/.test(specFile)
}

function getIntegerEnvVar(name, fallbackValue) {
  const value = process.env[name]?.trim()

  if (!value) {
    return fallbackValue
  }

  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
}

function getNumericEnvVar(name, fallbackValue) {
  const value = process.env[name]?.trim()

  if (!value) {
    return fallbackValue
  }

  const parsedValue = Number.parseFloat(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
}

function getOptionalIntegerEnvVar(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    return null
  }

  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function getStringEnvVar(name, fallbackValue) {
  return process.env[name]?.trim() || fallbackValue
}

function normalizeFileSlug(filePath) {
  return filePath
    .replace(/^tests\//, '')
    .replace(/\.spec\.ts$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}
