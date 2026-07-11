import jwt from 'jsonwebtoken'
import { getEnv } from './env'

const ENV = getEnv()

export function getJwtSecret(): string {
  const explicit = process.env.JWT_SECRET
  if (explicit) return explicit

  switch (ENV) {
    case "production":
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

const JWT_SECRET = getJwtSecret()
const JWT_EXPIRES_IN = '7d'

export interface JwtPayload {
  userId: string
  email: string
  tv: number
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    if (typeof decoded.tv !== 'number') return null
    return decoded
  } catch {
    return null
  }
}
