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
      data: {
        getItems: () => Promise<unknown[]>
        getArchived: () => Promise<unknown[]>
        getCompleted: () => Promise<unknown[]>
        createItem: (payload: unknown) => Promise<unknown>
        updateItem: (id: string, patch: unknown) => Promise<unknown>
        appendItemNote: (id: string, content: string) => Promise<unknown>
        archiveItem: (id: string) => Promise<void>
        deleteItem: (id: string) => Promise<void>
        restoreItem: (id: string) => Promise<void>
        completeItem: (id: string) => Promise<unknown>
        uncompleteItem: (id: string) => Promise<unknown>
        search: (query: string) => Promise<unknown[]>
        getTags: () => Promise<string[]>
        getSettings: () => Promise<unknown>
        getSpaces: () => Promise<unknown[]>
        createSpace: (name: string) => Promise<unknown>
        addItemToSpace: (spaceId: string, itemId: string, pinned?: boolean) => Promise<unknown[]>
        removeItemFromSpace: (spaceId: string, itemId: string) => Promise<unknown[]>
        setSpaceItemPinned: (spaceId: string, itemId: string, pinned: boolean) => Promise<unknown[]>
        touchItem: (id: string) => Promise<unknown>
        updateSettings: (patch: unknown) => Promise<unknown>
      }
      autostart: {
        get: () => Promise<boolean>
        set: (enabled: boolean) => Promise<void>
      }
    }
  }
}

export {}
