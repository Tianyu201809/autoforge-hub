import { getDb } from '../db/index'

export default defineNitroPlugin(async () => {
  await getDb()
  console.log('[DB] sql.js database initialized')
})
