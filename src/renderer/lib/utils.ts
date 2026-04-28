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
