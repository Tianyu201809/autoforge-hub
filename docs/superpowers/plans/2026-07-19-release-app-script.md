# Release App Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `release-app.js` that builds Autoforge Hub locally, uploads `.output` over SSH/SFTP with atomic switch, and runs `pm2 reload all`.

**Architecture:** Single ESM script at repo root. Pure helpers for CLI/config are unit-tested with Node's built-in `node:test`. Build uses `child_process`; transfer uses `ssh2-sftp-client` (upload + exec). Remote layout: upload to `.output.next`, verify, then `mv` swap with rollback on failure.

**Tech Stack:** Node >= 20, ESM, `ssh2`, `ssh2-sftp-client`, existing `npm run build:staging|prod`

**Spec:** `docs/superpowers/specs/2026-07-19-release-app-script-design.md`

## Global Constraints

- Script file: `release-app.js` (ESM, root)
- SSH password in script variables (placeholders empty in git); never log password
- `--env staging|prod`, default `staging`
- `REMOTE_DIR` default `/root/project/autoforge-hub`
- Atomic switch via `.output.next` / `.output.prev`; never touch `.env`, `data/`, `ecosystem.config.js`
- After successful switch: `cd REMOTE_DIR && pm2 reload all`
- No new test runner packages; use Node built-in `node:test` for pure helpers only
- Do not commit real SSH passwords

## File Structure

| Path | Responsibility |
|------|----------------|
| `release-app.js` | Full release CLI: config, build, SFTP upload, verify, switch, pm2 |
| `scripts/release-app-helpers.mjs` | Pure helpers (`parseEnv`, `validateSshConfig`, `buildScriptForEnv`) exported for unit tests |
| `scripts/release-app-helpers.test.mjs` | `node:test` coverage for helpers |
| `package.json` | `release` / `release:prod` scripts; `ssh2` + `ssh2-sftp-client` in devDependencies |

Helpers stay tiny and pure; all I/O stays in `release-app.js`.

---

### Task 1: Helpers + package scripts + dependencies

**Files:**
- Create: `scripts/release-app-helpers.mjs`
- Create: `scripts/release-app-helpers.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `parseEnv(argv: string[]): 'staging' | 'prod'` — reads `--env <value>`; default `'staging'`; throws `Error` on invalid value
  - `validateSshConfig(ssh: { host: string, password: string }): void` — throws if `host` or `password` empty/whitespace
  - `buildScriptForEnv(env: 'staging' | 'prod'): string` — returns `'build:staging'` or `'build:prod'`

- [ ] **Step 1: Write failing tests for helpers**

Create `scripts/release-app-helpers.test.mjs`:

```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseEnv,
  validateSshConfig,
  buildScriptForEnv,
} from './release-app-helpers.mjs'

describe('parseEnv', () => {
  it('defaults to staging', () => {
    assert.equal(parseEnv(['node', 'release-app.js']), 'staging')
  })

  it('reads --env prod', () => {
    assert.equal(parseEnv(['node', 'release-app.js', '--env', 'prod']), 'prod')
  })

  it('reads --env staging', () => {
    assert.equal(parseEnv(['node', 'release-app.js', '--env', 'staging']), 'staging')
  })

  it('throws on invalid env', () => {
    assert.throws(
      () => parseEnv(['node', 'release-app.js', '--env', 'dev']),
      /staging\|prod/,
    )
  })
})

describe('validateSshConfig', () => {
  it('throws when host empty', () => {
    assert.throws(
      () => validateSshConfig({ host: '', password: 'x' }),
      /host/,
    )
  })

  it('throws when password empty', () => {
    assert.throws(
      () => validateSshConfig({ host: '1.2.3.4', password: '  ' }),
      /password/,
    )
  })

  it('passes when host and password set', () => {
    assert.doesNotThrow(() =>
      validateSshConfig({ host: '1.2.3.4', password: 'secret' }),
    )
  })
})

describe('buildScriptForEnv', () => {
  it('maps staging and prod', () => {
    assert.equal(buildScriptForEnv('staging'), 'build:staging')
    assert.equal(buildScriptForEnv('prod'), 'build:prod')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `node --test scripts/release-app-helpers.test.mjs`

Expected: FAIL with ERR_MODULE_NOT_FOUND for `./release-app-helpers.mjs`

- [ ] **Step 3: Implement helpers**

Create `scripts/release-app-helpers.mjs`:

```js
/**
 * @param {string[]} argv
 * @returns {'staging' | 'prod'}
 */
export function parseEnv(argv) {
  const idx = argv.indexOf('--env')
  if (idx === -1) return 'staging'
  const value = argv[idx + 1]
  if (value !== 'staging' && value !== 'prod') {
    throw new Error(`Invalid --env "${value ?? ''}". Use staging|prod.`)
  }
  return value
}

/**
 * @param {{ host: string, password: string }} ssh
 */
export function validateSshConfig(ssh) {
  if (!ssh.host?.trim()) {
    throw new Error('SSH host is required. Set SSH.host in release-app.js.')
  }
  if (!ssh.password?.trim()) {
    throw new Error('SSH password is required. Set SSH.password in release-app.js.')
  }
}

/**
 * @param {'staging' | 'prod'} env
 */
export function buildScriptForEnv(env) {
  return env === 'prod' ? 'build:prod' : 'build:staging'
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `node --test scripts/release-app-helpers.test.mjs`

Expected: all tests PASS

- [ ] **Step 5: Add dependencies and npm scripts**

In `package.json`:

1. Under `"scripts"`, add after `"lint:fix"`:

```json
"release": "node release-app.js",
"release:prod": "node release-app.js --env prod",
"test:release-helpers": "node --test scripts/release-app-helpers.test.mjs"
```

2. Under `"devDependencies"`, add:

```json
"ssh2": "^1.17.0",
"ssh2-sftp-client": "^12.0.1"
```

(Use current compatible versions from npm at install time if these ranges resolve differently.)

Run:

```bash
npm install --save-dev ssh2 ssh2-sftp-client
```

Expected: `package-lock.json` updated; packages listed under `devDependencies`.

- [ ] **Step 6: Commit**

```bash
git add scripts/release-app-helpers.mjs scripts/release-app-helpers.test.mjs package.json package-lock.json
git commit -m "feat: add release-app helpers and SSH deploy dependencies"
```

---

### Task 2: Scaffold `release-app.js` with build step

**Files:**
- Create: `release-app.js`

**Interfaces:**
- Consumes: `parseEnv`, `validateSshConfig`, `buildScriptForEnv` from `./scripts/release-app-helpers.mjs`
- Produces:
  - `runBuild(env: 'staging' | 'prod'): Promise<void>`
  - `assertLocalOutput(): void`
  - `main()` starts wiring (build only in this task; later tasks fill upload/switch)

- [ ] **Step 1: Create `release-app.js` with config, logging, build, and early main**

Create `release-app.js`:

```js
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
```

- [ ] **Step 2: Verify config validation without network**

Run (with empty host/password as committed):

```bash
node release-app.js
```

Expected: exits non-zero with message about SSH host (or password), and does **not** start a long Nuxt build.

- [ ] **Step 3: Temporarily set host+password to dummy non-empty values and verify invalid env**

Edit `SSH.host` / `SSH.password` to temporary placeholders like `'x'` / `'y'` (do not commit real secrets). Then:

```bash
node release-app.js --env dev
```

Expected: exits with `Invalid --env "dev". Use staging|prod.`

Revert `SSH.host` / `SSH.password` back to `''` before commit.

- [ ] **Step 4: Commit**

```bash
git add release-app.js
git commit -m "feat: scaffold release-app.js with build and config validation"
```

---

### Task 3: SFTP connect, clean `.output.next`, upload with progress

**Files:**
- Modify: `release-app.js`

**Interfaces:**
- Consumes: `SSH`, `REMOTE_*` constants, `LOCAL_OUTPUT`
- Produces:
  - `connectSftp(): Promise<import('ssh2-sftp-client')>`
  - `remoteExec(sftp, command: string): Promise<{ code: number, stdout: string, stderr: string }>`
  - `uploadOutput(sftp): Promise<void>` — cleans `.output.next`, uploads local `.output` → remote `.output.next`, logs file progress
  - `disconnectSftp(sftp): Promise<void>`

- [ ] **Step 1: Add SFTP helpers and wire main through upload**

Replace the Task-2 stop in `main` and add the following functions to `release-app.js` (keep existing imports; add SftpClient):

```js
import SftpClient from 'ssh2-sftp-client'
import { readdirSync, statSync } from 'node:fs'

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
 */
async function remoteExec(sftp, command) {
  const result = await sftp.exec(command)
  // ssh2-sftp-client exec returns Buffer/string depending on version —
  // normalize to { code, stdout, stderr }. If API differs, use:
  // const conn = sftp.client; conn.exec(...) Promise wrapper.
  if (typeof result === 'string' || Buffer.isBuffer(result)) {
    return { code: 0, stdout: String(result), stderr: '' }
  }
  return {
    code: result.code ?? 0,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  }
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
```

Update `main` to:

```js
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
```

**Note on `sftp.exec`:** If the installed `ssh2-sftp-client` version does not expose `exec`, implement `remoteExec` with the underlying client:

```js
async function remoteExec(sftp, command) {
  const conn = sftp.client
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err)
      let stdout = ''
      let stderr = ''
      stream.on('data', (d) => { stdout += d.toString() })
      stream.stderr.on('data', (d) => { stderr += d.toString() })
      stream.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }))
    })
  })
}
```

Prefer this Promise wrapper if `sftp.exec` is missing or unreliable — it is the canonical approach.

- [ ] **Step 2: Manual smoke (optional if server credentials available)**

Fill `SSH` locally (do not commit). Run:

```bash
node release-app.js
```

Expected: build runs, SSH connects, files upload to `.output.next`, script stops before switch; existing remote `.output` unchanged.

If no server available during implementation: skip live upload; proceed after code review of upload loop.

- [ ] **Step 3: Ensure committed `SSH.password` / `SSH.host` remain empty placeholders**

- [ ] **Step 4: Commit**

```bash
git add release-app.js
git commit -m "feat: upload .output to remote .output.next over SFTP"
```

---

### Task 4: Verify upload + atomic switch with rollback

**Files:**
- Modify: `release-app.js`

**Interfaces:**
- Consumes: `remoteExec`, `LOCAL_OUTPUT`, `REMOTE_*`
- Produces:
  - `verifyOutput(sftp): Promise<void>` — checks `server/index.mjs` exists remotely; compares sizes for `server/index.mjs` and `server/package.json` (if local file exists)
  - `switchOutput(sftp): Promise<void>` — atomic mv sequence; on failure after moving `.output` → `.output.prev`, restore prev
  - `cleanupNext(sftp): Promise<void>` — `rm -rf .output.next`

- [ ] **Step 1: Implement verify, cleanup, switch**

Add to `release-app.js`:

```js
import { statSync as fsStatSync } from 'node:fs'

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
```

Update `main` try body:

```js
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
```

- [ ] **Step 2: Manual checks when server available**

1. Successful path: after run, remote has `.output/server/index.mjs`, no leftover `.output.next` / `.output.prev`.
2. Simulate verify failure (optional): temporarily change verify to expect a missing file; confirm `.output` unchanged and `.output.next` removed.

- [ ] **Step 3: Commit**

```bash
git add release-app.js
git commit -m "feat: verify upload and atomically switch remote .output"
```

---

### Task 5: `pm2 reload all` + finish main + docs touchpoint

**Files:**
- Modify: `release-app.js`
- Modify: `README.md` (short "Release" subsection only if README already has a Deploy/Run section; otherwise skip README — do not create large docs)

**Interfaces:**
- Produces: `reloadPm2(sftp): Promise<void>`
- `main()` completes full 1–6 flow; success message; exit 0

- [ ] **Step 1: Implement reloadPm2 and finalize main**

```js
/** @param {SftpClient} sftp */
async function reloadPm2(sftp) {
  log('6/6', 'pm2 reload all...')
  const { code, stdout, stderr } = await remoteExec(
    sftp,
    `cd ${shellQuote(REMOTE_DIR)} && pm2 reload all`,
  )
  if (stdout.trim()) console.log(stdout.trimEnd())
  if (stderr.trim()) console.error(stderr.trimEnd())
  if (code !== 0) {
    throw new Error(
      '代码已切换，但 PM2 reload 失败，请手动检查 (pm2 reload all exited non-zero)',
    )
  }
  console.log('  PM2 reload OK')
}
```

Final `main`:

```js
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
    await reloadPm2(sftp)
  } finally {
    await disconnectSftp(sftp)
  }

  console.log('\nRelease complete.')
}
```

Remove any "stop here for Task N" messages.

- [ ] **Step 2: Re-run helper tests**

Run: `npm run test:release-helpers`

Expected: PASS

- [ ] **Step 3: Dry validation without real deploy**

```bash
node release-app.js
```

Expected (empty SSH placeholders): fails fast on missing host/password.

- [ ] **Step 4: Full manual acceptance (with real credentials locally, not committed)**

Checklist from spec §10:

- [ ] `npm run release` → staging build + deploy works; service healthy
- [ ] `npm run release:prod` → prod build path
- [ ] Empty host/password fails immediately
- [ ] Wrong password: connect fails; remote `.output` unchanged
- [ ] Logs never print password

- [ ] **Step 5: Confirm git hygiene**

```bash
git diff release-app.js
```

Expected: `SSH.host` and `SSH.password` are still `''` in the committed tree (real values only in unstaged local edits that must not be committed).

- [ ] **Step 6: Commit**

```bash
git add release-app.js
git commit -m "feat: finish release-app.js with pm2 reload all"
```

If README was updated:

```bash
git add README.md
git commit -m "docs: note npm run release for SSH deploy"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| `release-app.js` ESM + package scripts | 1, 2 |
| `ssh2` / `ssh2-sftp-client` deps | 1 |
| SSH password variables, non-interactive | 2 |
| `--env` default staging; prod mapping | 1, 2 |
| `REMOTE_DIR` default `/root/project/autoforge-hub` | 2 |
| Local build then require `.output` | 2 |
| Clean `.output.next`, upload, verify sizes | 3, 4 |
| Atomic switch + rollback | 4 |
| Do not touch `.env` / `data` / ecosystem | 3–5 (only touch `.output*`) |
| `pm2 reload all` + failure message | 5 |
| Step logs `[n/6]`, no password logging | 2–5 |
| Manual acceptance checklist | 5 |

No TBD/placeholder steps remain after self-review.
