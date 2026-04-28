const TAG_COLORS: Array<[string, string]> = [
  ['rgba(37,99,235,0.12)', '#93c5fd'],
  ['rgba(249,115,22,0.10)', '#fdba74'],
  ['rgba(99,102,241,0.12)', '#a5b4fc'],
  ['rgba(20,184,166,0.10)', '#5eead4'],
  ['rgba(234,179,8,0.10)', '#fde047'],
  ['rgba(236,72,153,0.10)', '#f9a8d4']
]

export function tagColor(tag: string): [string, string] {
  let hash = 0
  for (let index = 0; index < tag.length; index += 1) {
    hash = (hash * 31 + tag.charCodeAt(index)) & 0xffff
  }

  return TAG_COLORS[hash % TAG_COLORS.length]
}

export interface ParsedTag {
  parent: string
  child: string | null
  raw: string
}

export function parseTag(tag: string): ParsedTag {
  const index = tag.indexOf('/')
  if (index === -1) {
    return {
      parent: tag.trim(),
      child: null,
      raw: tag
    }
  }

  return {
    parent: tag.slice(0, index).trim(),
    child: tag.slice(index + 1).trim() || null,
    raw: tag
  }
}

export function formatRelative(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(diff / 86_400_000)
  if (days === 1) {
    return 'yesterday'
  }
  if (days < 7) {
    return `${days}d ago`
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}w ago`
  }

  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  })
}

export function formatExact(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
