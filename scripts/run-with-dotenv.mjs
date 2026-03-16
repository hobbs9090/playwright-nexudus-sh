import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import * as dotenv from 'dotenv'

const args = process.argv.slice(2)
const separatorIndex = args.indexOf('--')
const commandArgs = separatorIndex === -1 ? args : args.slice(separatorIndex + 1)

if (commandArgs.length === 0) {
  console.error('Usage: node scripts/run-with-dotenv.mjs -- <command> [args...]')
  process.exit(1)
}

const envPath = path.resolve(process.cwd(), '.env')

if (existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false, quiet: true })
}

const child = spawn(commandArgs[0], commandArgs.slice(1), {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})

child.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})
