import { parseTag, tagColor } from '../lib/utils'

interface Props {
  tag: string
  dim?: boolean
}

export function TagPill({ tag, dim = false }: Props) {
  const { parent, child } = parseTag(tag)
  const [background, color] = tagColor(parent)

  return (
    <span
      className={`tag-pill ${dim ? 'tag-pill-dim' : ''}`}
      style={{ background, color }}
    >
      {child ? (
        <>
          <span className="tag-pill-parent">{parent}/</span>
          {child}
        </>
      ) : (
        parent
      )}
    </span>
  )
}

export default TagPill
