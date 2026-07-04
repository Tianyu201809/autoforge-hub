export type HubItemType = 'script' | 'flow' | 'app' | 'skill' | 'resource'

export type HubSort = 'top' | 'new'

export interface HubItem {
  id: string
  title: string
  type: HubItemType
  integrations: string[]
  verified: boolean
  /** 卡片大图标颜色，支持 hex / rgb / hsl。未设置时按主 integration 或类型推断 */
  iconColor?: string
  tags?: string[]
  createdAt: string
  popularity: number
}

export interface HubTypeFilter {
  id: HubItemType | 'all'
  label: string
  icon: string
}

export interface HubIntegrationFilter {
  id: string
  label: string
}
