import { parseTag } from '../lib/utils'

interface Props {
  tag: string
  dim?: boolean
}

export function TagPill({ tag, dim = false }: Props) {
  const { parent, child } = parseTag(tag)

  return (
    <span className={`tag-pill ${dim ? 'tag-pill-dim' : ''}`}>
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
