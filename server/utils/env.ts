/**
 * Environment configuration utility.
 * Determines the current runtime environment and provides
 * environment-specific paths and settings.
 *
 * Environment is controlled by the NUXT_ENV environment variable:
 *   - "development" (default): local dev, isolated data
 *   - "staging": test/pre-release, isolated data
 *   - "production": live production data
 */

export type AppEnvironment = "development" | "staging" | "production"

const VALID_ENVS: AppEnvironment[] = ["development", "staging", "production"]

export function getEnv(): AppEnvironment {
  const raw = process.env.NUXT_ENV?.trim().toLowerCase() || "development"
  if (VALID_ENVS.includes(raw as AppEnvironment)) {
    return raw as AppEnvironment
  }
  console.warn(`[env] Unknown NUXT_ENV "${raw}", falling back to "development"`)
  return "development"
}

export function isDevelopment(): boolean {
  return getEnv() === "development"
}

export function isStaging(): boolean {
  return getEnv() === "staging"
}

export function isProduction(): boolean {
  return getEnv() === "production"
}

/**
 * Returns a database path suitable for the current environment.
 * If ENV-specific DATABASE_URL is set, it takes precedence.
 * Otherwise, defaults to a named file per environment.
 */
export function getDatabasePath(overrideUrl?: string): string {
  if (overrideUrl) return overrideUrl

  const explicitUrl = process.env.DATABASE_URL
  if (explicitUrl) return explicitUrl

  const env = getEnv()
  const dbDir = "./data"
  switch (env) {
    case "staging":
      return `${dbDir}/autoforge-staging.db`
    case "production":
      return `${dbDir}/autoforge-prod.db`
    case "development":
    default:
      return `${dbDir}/autoforge-dev.db`
  }
}

/**
 * Returns a storage subdirectory name for the current environment.
 * Used to isolate uploaded files between environments.
 */
export function getStorageEnvDir(): string {
  return getEnv()
}
