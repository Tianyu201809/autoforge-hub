import { spawn } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import SftpClient from 'ssh2-sftp-client'
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

/** @returns {Promise<SftpClient>} */
async function connectSftp() {
  log('2/6', `Connecting SSH ${SSH.username}@${SSH.host}:${SSH.port}...`)
  const sftp = new SftpClient()
  await sftp.connect({
    host: SSH.host,
    port: SSH.port,
    username: SSH.username,
    password: SSH.password,
  })
  return sftp
}

/**
 * @param {SftpClient} sftp
 * @param {string} command
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
async function remoteExec(sftp, command) {
  // ssh2-sftp-client v12 has no sftp.exec — use underlying ssh2 client.
  const conn = sftp.client
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err)
      let stdout = ''
      let stderr = ''
      stream.on('data', (d) => {
        stdout += d.toString()
      })
      stream.stderr.on('data', (d) => {
        stderr += d.toString()
      })
      stream.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }))
    })
  })
}

/** Collect relative file paths under dir (posix-style for remote). */
function listFilesRecursive(dir, base = dir) {
  /** @type {string[]} */
  const files = []
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name)
    const st = statSync(abs)
    if (st.isDirectory()) files.push(...listFilesRecursive(abs, base))
    else files.push(path.relative(base, abs).split(path.sep).join('/'))
  }
  return files
}

/** @param {SftpClient} sftp */
async function uploadOutput(sftp) {
  log('3/6', 'Uploading .output → .output.next...')

  const existsNext = await sftp.exists(REMOTE_NEXT)
  if (existsNext) {
    console.log('  Removing leftover .output.next...')
    await remoteExec(sftp, `rm -rf ${shellQuote(REMOTE_NEXT)}`)
  }

  await sftp.mkdir(REMOTE_NEXT, true)

  const files = listFilesRecursive(LOCAL_OUTPUT)
  let done = 0
  for (const rel of files) {
    const localPath = path.join(LOCAL_OUTPUT, ...rel.split('/'))
    const remotePath = `${REMOTE_NEXT}/${rel}`
    const remoteDir = remotePath.slice(0, remotePath.lastIndexOf('/'))
    if (remoteDir && remoteDir !== REMOTE_NEXT) {
      await sftp.mkdir(remoteDir, true)
    }
    await sftp.fastPut(localPath, remotePath)
    done += 1
    if (done % 25 === 0 || done === files.length) {
      console.log(`  Uploaded ${done}/${files.length}`)
    }
  }
}

/** @param {string} value */
function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** @param {SftpClient} sftp */
async function disconnectSftp(sftp) {
  await sftp.end()
}

async function main() {
  const env = parseEnv(process.argv)
  validateSshConfig(SSH)
  await runBuild(env)
  assertLocalOutput()

  const sftp = await connectSftp()
  try {
    await uploadOutput(sftp)
    log('3/6', 'Upload OK. Verify/switch not implemented yet — stop here for Task 3.')
  } finally {
    await disconnectSftp(sftp)
  }
}

main().catch((err) => {
  console.error(`\nRelease failed: ${err.message}`)
  process.exit(1)
})
