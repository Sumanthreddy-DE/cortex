import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  existingTags: string[]
  placeholder?: string
  className?: string
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getHashQuery(text: string): string | null {
  const match = text.match(/(?:^|,\s*)#([\w/-]*)$/)
  return match ? match[1] : null
}

export function TagAutocomplete({ value, onChange, existingTags, placeholder, className }: Props) {
  const [dropdownQuery, setDropdownQuery] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions =
    dropdownQuery !== null
      ? existingTags
          .filter(
            (tag, index, allTags) =>
              allTags.findIndex((entry) => entry.toLowerCase() === tag.toLowerCase()) === index
          )
          .filter((tag) => tag.toLowerCase().startsWith(dropdownQuery.toLowerCase()))
          .slice(0, 8)
      : []

  useEffect(() => {
    setActiveIndex(0)
  }, [dropdownQuery])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value
    onChange(nextValue)
    setDropdownQuery(getHashQuery(nextValue))
  }

  function selectTag(tag: string) {
    const nextValue = value.replace(/(?:^|,\s*)#([\w/-]*)$/, (match) =>
      match.replace(/#([\w/-]*)$/, tag)
    )
    onChange(nextValue)
    setDropdownQuery(null)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (dropdownQuery === null || suggestions.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      const selected = suggestions[activeIndex]
      if (selected) {
        event.preventDefault()
        selectTag(selected)
      }
      return
    }

    if (event.key === 'Escape') {
      setDropdownQuery(null)
    }
  }

  function highlightMatch(tag: string, query: string): ReactNode {
    if (!query) {
      return tag
    }

    const match = tag.match(new RegExp(`^(${escapeRegex(query)})(.*)$`, 'i'))
    if (!match) {
      return tag
    }

    return (
      <>
        <span className="tag-autocomplete-match">{match[1]}</span>
        {match[2]}
      </>
    )
  }

  return (
    <div className="tag-autocomplete-wrap">
      <input
        ref={inputRef}
        className={className}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(() => setDropdownQuery(null), 150)
        }}
        placeholder={placeholder}
      />

      {dropdownQuery !== null && suggestions.length > 0 ? (
        <div className="tag-autocomplete-dropdown" role="listbox">
          {suggestions.map((tag, index) => (
            <div
              key={tag}
              className="tag-autocomplete-item"
              data-active={index === activeIndex || undefined}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault()
                selectTag(tag)
              }}
            >
              {highlightMatch(tag, dropdownQuery)}
            </div>
          ))}
          {dropdownQuery &&
          !existingTags.some((tag) => tag.toLowerCase() === dropdownQuery.toLowerCase()) ? (
            <div className="tag-autocomplete-new">Press Enter to create "{dropdownQuery}"</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default TagAutocomplete
