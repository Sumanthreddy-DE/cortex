import './_group.css'

export function Current() {
  return (
    <div className="preview-shell">
      <div className="lane">
        <header className="lane-head">
          <h3 className="lane-title lane-title-hero">Today</h3>
          <span className="lane-meta">00 ITEMS</span>
        </header>
        <div className="lane-rule" />
        <div className="empty-state">
          Drop here or add something new.
        </div>
      </div>
    </div>
  )
}
