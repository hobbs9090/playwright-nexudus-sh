const defaultTargetMinutes = 5
const defaultFixedOverheadMinutes = 1.25
const defaultMaxShardsPerProject = 4

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
      project: projectPlan.project,
      project_slug: projectPlan.slug,
      shard_index: shardIndex,
      shard_total: shardTotal,
    })
  }
}

const outputs = {
  execution_budget_minutes: executionBudgetMinutes,
  matrix,
  target_minutes: targetMinutes,
  total_runners: matrix.length,
}

process.stdout.write(`matrix=${JSON.stringify(matrix)}\n`)
process.stdout.write(`target_minutes=${targetMinutes}\n`)
process.stdout.write(`execution_budget_minutes=${executionBudgetMinutes}\n`)
process.stdout.write(`total_runners=${matrix.length}\n`)
process.stderr.write(`Playwright CI matrix: ${JSON.stringify(outputs, null, 2)}\n`)

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
