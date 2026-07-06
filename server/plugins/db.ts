import { getDb } from '../db/index'
import { getEnv, getDatabasePath } from '../utils/env'

export default defineNitroPlugin(async () => {
  const env = getEnv()
  const dbPath = getDatabasePath()
  console.log(`[DB] sql.js database initialized (env: ${env}, path: ${dbPath})`)
})
