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
