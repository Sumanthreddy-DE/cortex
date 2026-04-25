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
  autostart: {
    get: () => ipcRenderer.invoke('autostart:get') as Promise<boolean>,
    set: (enabled: boolean) => ipcRenderer.invoke('autostart:set', enabled) as Promise<void>
  }
})
