export function hasDesktopBridge(): boolean {
  return typeof window !== 'undefined' && typeof window.cortex !== 'undefined'
}

export function hasAutoStartSupport(): boolean {
  return hasDesktopBridge() && typeof window.cortex.autostart !== 'undefined'
}

export function hasCalendarSupport(): boolean {
  return hasDesktopBridge() && typeof window.cortex.addToCalendar === 'function'
}
