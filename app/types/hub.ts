export type HubItemType = 'script' | 'flow' | 'app' | 'skill' | 'resource'

export type HubSort = 'top' | 'new'

export interface HubItem {
  id: string
  title: string
  type: HubItemType
  integrations: string[]
  verified: boolean
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
