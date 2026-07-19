import { spawn } from 'node:child_process'
import { existsSync, readdirSync, statSync, statSync as fsStatSync } from 'node:fs'
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

/** @param {SftpClient} sftp */
async function cleanupNext(sftp) {
  const existsNext = await sftp.exists(REMOTE_NEXT)
  if (existsNext) {
    const { code, stderr } = await remoteExec(
      sftp,
      `rm -rf ${shellQuote(REMOTE_NEXT)}`,
    )
    if (code !== 0) {
      throw new Error(`Failed to remove .output.next: ${stderr}`)
    }
  }
}

/** @param {SftpClient} sftp */
async function verifyOutput(sftp) {
  log('4/6', 'Verifying upload...')
  const entryRemote = `${REMOTE_NEXT}/server/index.mjs`
  if (!(await sftp.exists(entryRemote))) {
    throw new Error(`Remote entry missing after upload: ${entryRemote}`)
  }

  const samples = ['server/index.mjs', 'server/package.json']
  for (const rel of samples) {
    const localPath = path.join(LOCAL_OUTPUT, ...rel.split('/'))
    if (!existsSync(localPath)) continue
    const localSize = fsStatSync(localPath).size
    const remotePath = `${REMOTE_NEXT}/${rel}`
    const remoteStat = await sftp.stat(remotePath)
    if (remoteStat.size !== localSize) {
      throw new Error(
        `Size mismatch for ${rel}: local=${localSize} remote=${remoteStat.size}`,
      )
    }
  }
  console.log('  Verify OK')
}

/** @param {SftpClient} sftp */
async function switchOutput(sftp) {
  log('5/6', 'Switching .output...')
  const hasOutput = Boolean(await sftp.exists(REMOTE_OUTPUT))
  let movedPrev = false

  try {
    if (hasOutput) {
      const r1 = await remoteExec(
        sftp,
        `mv ${shellQuote(REMOTE_OUTPUT)} ${shellQuote(REMOTE_PREV)}`,
      )
      if (r1.code !== 0) {
        throw new Error(`mv .output → .output.prev failed: ${r1.stderr}`)
      }
      movedPrev = true
    }

    const r2 = await remoteExec(
      sftp,
      `mv ${shellQuote(REMOTE_NEXT)} ${shellQuote(REMOTE_OUTPUT)}`,
    )
    if (r2.code !== 0) {
      throw new Error(`mv .output.next → .output failed: ${r2.stderr}`)
    }

    if (movedPrev || (await sftp.exists(REMOTE_PREV))) {
      const r3 = await remoteExec(sftp, `rm -rf ${shellQuote(REMOTE_PREV)}`)
      if (r3.code !== 0) {
        console.warn(`  Warning: failed to remove .output.prev: ${r3.stderr}`)
      }
    }
    console.log('  Switch OK')
  } catch (err) {
    if (movedPrev) {
      console.error('  Switch failed — restoring .output.prev → .output')
      await remoteExec(
        sftp,
        `mv ${shellQuote(REMOTE_PREV)} ${shellQuote(REMOTE_OUTPUT)}`,
      )
    }
    await cleanupNext(sftp).catch(() => {})
    throw err
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
    try {
      await verifyOutput(sftp)
    } catch (err) {
      await cleanupNext(sftp)
      throw err
    }
    await switchOutput(sftp)
    log('5/6', 'Switch OK. PM2 reload not implemented yet — stop here for Task 4.')
  } finally {
    await disconnectSftp(sftp)
  }
}

main().catch((err) => {
  console.error(`\nRelease failed: ${err.message}`)
  process.exit(1)
})
