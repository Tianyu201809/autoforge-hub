import jwt from 'jsonwebtoken'
import { isProduction, getEnv } from './env'

const ENV = getEnv()

function resolveSecret(): string {
  const explicit = process.env.JWT_SECRET
  if (explicit) return explicit

  // Environment-specific defaults
  switch (ENV) {
    case "production":
      // In production, JWT_SECRET MUST be explicitly set
      console.error(
        "[jwt] FATAL: JWT_SECRET is not configured in production! " +
        "Set the JWT_SECRET environment variable to a strong, unique value."
      )
      process.exit(1)
    case "staging":
      return "autoforge-hub-staging-secret-key"
    case "development":
    default:
      return "autoforge-hub-dev-secret-key"
  }
}

const JWT_SECRET = resolveSecret()
const JWT_EXPIRES_IN = '7d'

export interface JwtPayload {
  userId: string
  email: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}
