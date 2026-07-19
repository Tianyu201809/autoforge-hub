import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseEnv,
  validateSshConfig,
  buildScriptForEnv,
} from './scripts/release-app-helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const LOCAL_OUTPUT = path.join(ROOT, '.output')

/** Fill in locally. Keep password empty in git. */
const SSH = {
  host: '',
  port: 22,
  username: 'root',
  password: '',
}

const REMOTE_DIR = '/root/project/autoforge-hub'
const REMOTE_OUTPUT = `${REMOTE_DIR}/.output`
const REMOTE_NEXT = `${REMOTE_DIR}/.output.next`
const REMOTE_PREV = `${REMOTE_DIR}/.output.prev`

function log(step, message) {
  console.log(`[${step}] ${message}`)
}

/**
 * @param {'staging' | 'prod'} env
 */
function runBuild(env) {
  const script = buildScriptForEnv(env)
  log('1/6', `Building (${env}) via npm run ${script}...`)
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Build failed with exit code ${code}`))
    })
  })
}

function assertLocalOutput() {
  if (!existsSync(LOCAL_OUTPUT)) {
    throw new Error(`Local .output missing after build: ${LOCAL_OUTPUT}`)
  }
  const entry = path.join(LOCAL_OUTPUT, 'server', 'index.mjs')
  if (!existsSync(entry)) {
    throw new Error(`Local build entry missing: ${entry}`)
  }
}

async function main() {
  const env = parseEnv(process.argv)
  validateSshConfig(SSH)
  await runBuild(env)
  assertLocalOutput()
  log('1/6', 'Build OK. Upload not implemented yet — stop here for Task 2.')
  // Task 3+ will continue: connect → upload → verify → switch → pm2
}

main().catch((err) => {
  console.error(`\nRelease failed: ${err.message}`)
  process.exit(1)
})
