import { HUB_ITEMS } from '~/data/hub-items'
import type { HubItemType, HubSort } from '~/types/hub'

export function useHubFilters() {
  const selectedType = ref<HubItemType | 'all'>('all')
  const selectedIntegration = ref('all')
  const selectedTags = ref<string[]>([])
  const sortBy = ref<HubSort>('top')
  const searchQuery = ref('')

  const filteredItems = computed(() => {
    let items = [...HUB_ITEMS]

    if (selectedType.value !== 'all') {
      items = items.filter(item => item.type === selectedType.value)
    }

    if (selectedIntegration.value !== 'all') {
      items = items.filter(item =>
        item.integrations.includes(selectedIntegration.value)
      )
    }

    if (selectedTags.value.length > 0) {
      items = items.filter(item =>
        selectedTags.value.every(tag =>
          item.integrations.includes(tag) || item.tags?.includes(tag)
        )
      )
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      items = items.filter(item =>
        item.title.toLowerCase().includes(q)
        || item.integrations.some(i => i.includes(q))
        || item.type.includes(q)
      )
    }

    if (sortBy.value === 'top') {
      items.sort((a, b) => b.popularity - a.popularity)
    } else {
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }

    return items
  })

  function toggleTag(tag: string) {
    const index = selectedTags.value.indexOf(tag)
    if (index >= 0) {
      selectedTags.value.splice(index, 1)
    } else {
      selectedTags.value.push(tag)
    }
  }

  function resetFilters() {
    selectedType.value = 'all'
    selectedIntegration.value = 'all'
    selectedTags.value = []
    searchQuery.value = ''
  }

  return {
    selectedType,
    selectedIntegration,
    selectedTags,
    sortBy,
    searchQuery,
    filteredItems,
    toggleTag,
    resetFilters
  }
}
