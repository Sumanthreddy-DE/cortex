import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cortex', {
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  },
  closeQuickAdd: () => ipcRenderer.send('quick-add:close'),
  addToCalendar: (title: string, priority: string, date?: string) =>
    ipcRenderer.invoke('calendar:add', { title, priority, date }),
  data: {
    getItems: () => ipcRenderer.invoke('data:get-items'),
    getArchived: () => ipcRenderer.invoke('data:get-archived'),
    getCompleted: () => ipcRenderer.invoke('data:get-completed'),
    createItem: (payload: unknown) => ipcRenderer.invoke('data:create-item', payload),
    updateItem: (id: string, patch: unknown) => ipcRenderer.invoke('data:update-item', id, patch),
    appendItemNote: (id: string, content: string) => ipcRenderer.invoke('data:append-item-note', id, content),
    archiveItem: (id: string) => ipcRenderer.invoke('data:archive-item', id),
    deleteItem: (id: string) => ipcRenderer.invoke('data:delete-item', id),
    restoreItem: (id: string) => ipcRenderer.invoke('data:restore-item', id),
    completeItem: (id: string) => ipcRenderer.invoke('data:complete-item', id),
    uncompleteItem: (id: string) => ipcRenderer.invoke('data:uncomplete-item', id),
    search: (query: string) => ipcRenderer.invoke('data:search', query),
    getTags: () => ipcRenderer.invoke('data:get-tags'),
    getSettings: () => ipcRenderer.invoke('data:get-settings'),
    updateSettings: (patch: unknown) => ipcRenderer.invoke('data:update-settings', patch)
  },
  autostart: {
    get: () => ipcRenderer.invoke('autostart:get') as Promise<boolean>,
    set: (enabled: boolean) => ipcRenderer.invoke('autostart:set', enabled) as Promise<void>
  }
})
