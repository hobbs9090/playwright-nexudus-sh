const defaultTargetMinutes = 5
const defaultFixedOverheadMinutes = 1.25
const defaultMaxShardsPerProject = 4
const defaultBranch = getStringEnvVar('GITHUB_DEFAULT_BRANCH', 'main')
const comparisonBaseBranch = defaultBranch
const branchMode = 'full-suite'

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

const changedLighthouseSpecs = []
const matrix = buildFullSuiteMatrix()
const targetMinutes = getNumericEnvVar('PLAYWRIGHT_CI_TARGET_MINUTES', defaultTargetMinutes)
const fixedOverheadMinutes = getNumericEnvVar('PLAYWRIGHT_CI_FIXED_OVERHEAD_MINUTES', defaultFixedOverheadMinutes)
const executionBudgetMinutes = Math.max(1, targetMinutes - fixedOverheadMinutes)
const runLighthouse = true
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

function clampShardCount(value, maxShardsPerProject) {
  const normalizedValue = Number.isFinite(value) ? Math.floor(value) : 1
  return Math.max(1, Math.min(maxShardsPerProject, normalizedValue))
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
