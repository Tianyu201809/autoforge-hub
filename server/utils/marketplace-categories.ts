/** Keep in sync with `MARKETPLACE_CATEGORIES` in `app/types/workspace.ts`. */
export const MARKETPLACE_CATEGORIES = [
  '实用工具', '自动化', '数据处理', '数据爬取',
  'DevOps', 'Web 开发', 'AI/ML',
  '数据库', '监控', '安全', '测试', '其他',
] as const

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number]
