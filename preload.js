const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // API for getting todos
  getTodos: () => ipcRenderer.invoke('get-todos'),

  // API for adding a todo
  addTodo: (todo) => ipcRenderer.invoke('add-todo', todo),

  // API for removing a todo
  removeTodo: (id) => ipcRenderer.invoke('remove-todo', id),

  // API for toggling a todo's completion status
  toggleTodo: (id) => ipcRenderer.invoke('toggle-todo', id),

  // API for updating a todo
  updateTodo: (id, updates) => ipcRenderer.invoke('update-todo', id, updates),
})
