import type { Script, StoredScript, ScriptSort } from '~/types/workspace'

const SCRIPTS_KEY = 'autoforge-scripts'

function generateId(): string {
  return crypto.randomUUID()
}

function readScripts(): StoredScript[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY)
    return raw ? (JSON.parse(raw) as StoredScript[]) : []
  } catch {
    return []
  }
}

function writeScripts(scripts: StoredScript[]) {
  if (!import.meta.client) return
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts))
}

function toScript(s: StoredScript): Script {
  return { ...s }
}

export function useScripts() {
  const scripts = useState<Script[]>('workspace-scripts', () => [])
  const hydrated = useState('scripts-hydrated', () => false)

  function loadScripts() {
    if (!import.meta.client) return
    const stored = readScripts()
    scripts.value = stored.map(toScript)
    hydrated.value = true
  }

  function getPersonalScripts(userId: string): Script[] {
    return scripts.value.filter(s => s.ownerId === userId && !s.teamId)
  }

  function getTeamScripts(teamId: string): Script[] {
    return scripts.value.filter(s => s.teamId === teamId)
  }

  function addScript(
    title: string,
    description: string,
    zipName: string,
    zipSize: number,
    tags: string[],
    ownerId: string,
    teamId?: string
  ): Script {
    const now = new Date().toISOString()
    const stored: StoredScript = {
      id: generateId(),
      title,
      description,
      zipName,
      zipSize,
      tags,
      createdAt: now,
      updatedAt: now,
      ownerId,
      teamId
    }
    const all = readScripts()
    all.push(stored)
    writeScripts(all)
    const script = toScript(stored)
    scripts.value.push(script)
    return script
  }

  function deleteScript(id: string) {
    const all = readScripts()
    const filtered = all.filter(s => s.id !== id)
    writeScripts(filtered)
    scripts.value = scripts.value.filter(s => s.id !== id)
  }

  function searchScripts(userId: string, query: string): Script[] {
    const personal = getPersonalScripts(userId)
    if (!query.trim()) return personal
    const q = query.trim().toLowerCase()
    return personal.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  function sortScripts(list: Script[], sort: ScriptSort): Script[] {
    const sorted = [...list]
    switch (sort) {
      case 'newest':
        return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      case 'oldest':
        return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      case 'name':
        return sorted.sort((a, b) => a.title.localeCompare(b.title))
    }
  }

  return {
    scripts,
    hydrated,
    loadScripts,
    getPersonalScripts,
    getTeamScripts,
    addScript,
    deleteScript,
    searchScripts,
    sortScripts
  }
}
