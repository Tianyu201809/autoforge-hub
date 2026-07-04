import type { HubItem, HubItemType } from '~/types/hub'

const integrationIcons: Record<string, string> = {
  http: 'lucide:cloud',
  github: 'lucide:github',
  slack: 'lucide:message-square',
  openai: 'lucide:sparkles',
  postgresql: 'lucide:database',
  gmail: 'lucide:mail',
  discord: 'lucide:message-circle',
  autoforge: 'lucide:anvil',
  mongodb: 'lucide:database-backup',
  supabase: 'lucide:database',
  gsheets: 'lucide:table-2',
  hackernews: 'lucide:newspaper',
  mailgun: 'lucide:send',
  sendgrid: 'lucide:send-horizontal',
  gdrive: 'lucide:hard-drive',
  matrix: 'lucide:grid-2x2',
  pushover: 'lucide:bell-ring',
  airtable: 'lucide:layout-grid',
  reddit: 'lucide:radio',
  teams: 'lucide:users',
  clickhouse: 'lucide:bar-chart-3',
  mysql: 'lucide:database',
  mastodon: 'lucide:at-sign',
  helper: 'lucide:wrench',
  rss: 'lucide:rss',
  nextcloud: 'lucide:cloud-cog',
  ai: 'lucide:brain-circuit',
  apify: 'lucide:bot',
  gworkspace: 'lucide:layout-grid',
  windmill: 'lucide:wind',
  k8s: 'lucide:boxes',
  kubernetes: 'lucide:boxes',
  aws: 'lucide:cloud-lightning',
  cloud: 'lucide:cloud',
  s3: 'lucide:archive'
}

/** 各 integration 默认图标色（品牌色 / 语义色） */
const integrationColors: Record<string, string> = {
  http: '#3b82f6',
  github: '#1f883d',
  slack: '#611f69',
  openai: '#10a37e',
  postgresql: '#336791',
  gmail: '#ea4335',
  discord: '#5865f2',
  autoforge: '#ff8c00',
  mongodb: '#47a248',
  supabase: '#3ecf8e',
  gsheets: '#34a853',
  hackernews: '#ff6600',
  mailgun: '#c02428',
  sendgrid: '#1a82e2',
  gdrive: '#4285f4',
  matrix: '#0dbd8b',
  pushover: '#249739',
  airtable: '#fcb400',
  reddit: '#ff4500',
  teams: '#6264a7',
  clickhouse: '#ffcc01',
  mysql: '#00758f',
  mastodon: '#6364ff',
  helper: '#64748b',
  rss: '#f26522',
  nextcloud: '#0082c9',
  ai: '#8b5cf6',
  apify: '#97d700',
  gworkspace: '#4285f4',
  windmill: '#3b82f6',
  k8s: '#326ce5',
  kubernetes: '#326ce5',
  aws: '#ff9900',
  cloud: '#0ea5e9',
  s3: '#569a31'
}

const typeIcons: Record<HubItemType, string> = {
  script: 'lucide:file-code-2',
  flow: 'lucide:workflow',
  app: 'lucide:layout-dashboard',
  skill: 'lucide:hammer',
  resource: 'lucide:plug-2'
}

const typeColors: Record<HubItemType, string> = {
  script: '#2563eb',
  flow: '#7c3aed',
  app: '#059669',
  skill: '#ff8c00',
  resource: '#64748b'
}

export function getIntegrationIcon(integration: string): string {
  return integrationIcons[integration.toLowerCase()] ?? 'lucide:box'
}

export function getIntegrationColor(integration: string): string {
  return integrationColors[integration.toLowerCase()] ?? '#71717a'
}

export function getItemHeroIcon(item: HubItem): string {
  const primary = item.integrations[0]
  if (primary) return getIntegrationIcon(primary)
  return typeIcons[item.type]
}

/** 解析卡片大图标颜色：item.iconColor > 主 integration > 类型默认 */
export function getItemIconColor(item: HubItem): string {
  if (item.iconColor) return item.iconColor
  const primary = item.integrations[0]
  if (primary) return getIntegrationColor(primary)
  return typeColors[item.type]
}

/** 预览区背景淡色 tint，与图标色呼应 */
export function getItemPreviewTint(item: HubItem): string {
  return getItemIconColor(item)
}

export function formatIntegrationLabel(integration: string): string {
  if (integration === 'http') return 'Http'
  if (integration === 'gsheets') return 'GSheets'
  return integration.charAt(0).toUpperCase() + integration.slice(1)
}

export const hubTypeLabels: Record<HubItemType, string> = {
  script: 'Script',
  flow: 'Flow',
  app: 'App',
  skill: 'Skill',
  resource: 'Resource type'
}
