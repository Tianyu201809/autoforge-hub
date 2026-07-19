/**
 * @param {string[]} argv
 * @returns {'staging' | 'prod' | 'development'}
 */
export function parseEnv(argv) {
  const idx = argv.indexOf('--env')
  if (idx === -1) return 'development'
  const value = argv[idx + 1]
  if (value !== 'staging' && value !== 'prod' && value !== 'development') {
    throw new Error(`Invalid --env "${value ?? ''}". Use staging|prod|development.`)
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
 * @param {'staging' | 'prod' | 'development'} env
 */
export function buildScriptForEnv(env) {
  return env === 'prod' ? 'build:prod' : env === 'staging' ? 'build:staging' : 'build:dev'
}
