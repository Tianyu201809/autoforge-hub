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

const typeIcons: Record<HubItemType, string> = {
  script: 'lucide:file-code-2',
  flow: 'lucide:workflow',
  app: 'lucide:layout-dashboard',
  skill: 'lucide:hammer',
  resource: 'lucide:plug-2'
}

export function getIntegrationIcon(integration: string): string {
  return integrationIcons[integration.toLowerCase()] ?? 'lucide:box'
}

export function getItemHeroIcon(item: HubItem): string {
  const primary = item.integrations[0]
  if (primary) return getIntegrationIcon(primary)
  return typeIcons[item.type]
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
