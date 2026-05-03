import './_group.css'

export function Sans() {
  return (
    <div className="preview-shell">
      <div className="lane">
        <header className="lane-head">
          <h3 className="lane-title lane-title-hero">Today</h3>
          <span className="lane-meta">00 ITEMS</span>
        </header>
        <div className="lane-rule" />
        <div className="empty-state empty-state--sans">
          Drop here or add something new.
        </div>
      </div>
    </div>
  )
}
