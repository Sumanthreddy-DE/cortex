/// <reference types="vite/client" />

declare global {
  interface Window {
    cortex: {
      versions: {
        chrome: string
        electron: string
        node: string
      }
      closeQuickAdd: () => void
      addToCalendar: (
        title: string,
        priority: string,
        date?: string
      ) => Promise<{ ok: boolean; error?: string }>
      autostart: {
        get: () => Promise<boolean>
        set: (enabled: boolean) => Promise<void>
      }
    }
  }
}

export {}
