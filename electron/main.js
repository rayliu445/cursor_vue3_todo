const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// 读取外部配置文件
const configPath = path.join(app.getAppPath(), 'config.json')
let appConfig = {
  enableLogging: true,
  logLevel: 'INFO',
  userDataPath: '~/Library/Application Support/Cursor Vue3 Todo',
}

if (fs.existsSync(configPath)) {
  try {
    const configContent = fs.readFileSync(configPath, 'utf-8')
    appConfig = { ...appConfig, ...JSON.parse(configContent) }
  } catch (error) {
    console.warn('Could not read config file, using defaults:', error.message)
  }
}

// 日志配置
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
}

// 使用配置中的日志级别
const currentLogLevel = appConfig.logLevel || 'INFO'
const logLevelNum = LOG_LEVELS[currentLogLevel] ?? LOG_LEVELS.INFO

const logDir = path.join(app.getPath('userData'), 'logs')
const logFilePath = path.join(
  logDir,
  `app-${new Date().toISOString().slice(0, 10)}.log`,
)

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

function log(level, message) {
  const levelNum = LOG_LEVELS[level] || LOG_LEVELS.INFO

  // 只有当启用了日志且日志级别高于或等于当前设置的日志级别时才记录
  if (appConfig.enableLogging && levelNum <= logLevelNum) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level}] ${message}\n`
    console.log(logMessage.trim())
    fs.appendFileSync(logFilePath, logMessage)
  }
}

function debug(message) {
  log('DEBUG', message)
}

function info(message) {
  log('INFO', message)
}

function warn(message) {
  log('WARN', message)
}

function error(message) {
  log('ERROR', message)
}

// 数据存储目录 (用户可见)
const DATA_DIR = path.join(app.getPath('userData'), 'data')
const dbPath = path.join(DATA_DIR, 'db.json')
const CRDT_PATH = path.join(DATA_DIR, 'todo.crdt')
const JSON_EXPORT_PATH = path.join(DATA_DIR, 'todo-data.json')

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    info(`Created data directory: ${DATA_DIR}`)
  }
}

// 确保数据目录和文件存在
function ensureDbExists() {
  ensureDataDir()
  if (!fs.existsSync(dbPath)) {
    info('Database does not exist, creating new one')
    fs.writeFileSync(dbPath, JSON.stringify({ todos: [] }))
  }
}

// 读取数据
function readDb() {
  try {
    ensureDbExists()
    const data = fs.readFileSync(dbPath, 'utf-8')
    const parsedData = JSON.parse(data)
    debug(`Successfully read ${parsedData.todos.length} todos from database`)
    return parsedData
  } catch (error) {
    error(`Error reading database: ${error.message}`)
    return { todos: [] }
  }
}

// 写入数据
function writeDb(data) {
  try {
    ensureDataDir()
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
    // 同时写入用户可见的 JSON 文件
    const userFriendly = {
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: data.todos || [],
    }
    fs.writeFileSync(JSON_EXPORT_PATH, JSON.stringify(userFriendly, null, 2))
    debug(`Successfully wrote ${data.todos.length} todos to database`)
  } catch (error) {
    error(`Error writing to database: ${error.message}`)
  }
}

let mainWindow
function createWindow() {
  info('Creating browser window')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // 根据环境加载不同内容
  if (app.isPackaged) {
    const indexPath = path.join(__dirname, '../dist/index.html')
    info('Loading packaged app from: ' + indexPath)
    mainWindow.loadFile(indexPath)
  } else {
    info('Loading from development server: http://localhost:3000')
    mainWindow.loadURL('http://localhost:3000')
  }

  // 检查页面加载错误
  mainWindow.webContents.on(
    'did-fail-load',
    (event, errorCode, errorDescription, validatedURL) => {
      error(
        `Failed to load: ${errorCode} - ${errorDescription} at ${validatedURL}`,
      )
    },
  )

  // 监听控制台错误
  mainWindow.webContents.on(
    'console-message',
    (event, level, message, line, sourceId) => {
      debug(`Console message [${level}]: ${message} at ${sourceId}:${line}`)
    },
  )

  mainWindow.webContents.on('dom-ready', () => {
    info('DOM is ready')
  })

  // 打开开发者工具以便调试
  setTimeout(() => {
    if (
      process.env.NODE_ENV === 'development' ||
      logLevelNum >= LOG_LEVELS.DEBUG
    ) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
      info('DevTools opened')
    }
  }, 1000)

  mainWindow.on('closed', () => {
    info('Window closed')
    mainWindow = null
  })
}

// IPC handlers for todo operations
ipcMain.handle('get-todos', async () => {
  debug('Handling get-todos request')
  const db = readDb()
  return db.todos
})

// 获取数据目录路径（用户可见的文件夹）
ipcMain.handle('get-data-path', async () => {
  ensureDataDir()
  return {
    dir: DATA_DIR,
    dbFile: dbPath,
    jsonExport: JSON_EXPORT_PATH,
    crdtFile: CRDT_PATH,
  }
})

ipcMain.handle('add-todo', async (event, todo) => {
  debug(`Handling add-todo request: ${JSON.stringify(todo)}`)
  const db = readDb()
  const newTodo = {
    id: Date.now().toString(),
    title: todo.title,
    completed: todo.completed ?? false,
    priority: todo.priority ?? 0,
    dueDate: todo.dueDate || null,
    startDate: todo.startDate || null,
    content: todo.content || null,
    tags: todo.tags || [],
    list: todo.list || null,
    isAllDay: todo.isAllDay ?? false,
    completedTime: todo.completedTime || null,
    createdAt: todo.createdAt || new Date().toISOString(),
  }

  db.todos.push(newTodo)
  writeDb(db)
  info(`Added new todo with id: ${newTodo.id}`)
  return newTodo
})

ipcMain.handle('remove-todo', async (event, id) => {
  debug(`Handling remove-todo request for id: ${id}`)
  const db = readDb()
  const initialCount = db.todos.length
  db.todos = db.todos.filter((todo) => todo.id !== id)
  writeDb(db)
  info(
    `Removed todo with id: ${id}. Count went from ${initialCount} to ${db.todos.length}`,
  )
  return { success: true }
})

ipcMain.handle('toggle-todo', async (event, id) => {
  debug(`Handling toggle-todo request for id: ${id}`)
  const db = readDb()
  const todoIndex = db.todos.findIndex((todo) => todo.id === id)

  if (todoIndex !== -1) {
    db.todos[todoIndex].completed = !db.todos[todoIndex].completed
    writeDb(db)
    info(
      `Toggled todo with id: ${id}. New status: ${db.todos[todoIndex].completed}`,
    )
    return db.todos[todoIndex]
  }

  warn(`Todo with id ${id} not found for toggle`)
  return null
})

ipcMain.handle('update-todo', async (event, id, updates) => {
  debug(
    `Handling update-todo request for id: ${id} with updates: ${JSON.stringify(
      updates,
    )}`,
  )
  const db = readDb()
  const todoIndex = db.todos.findIndex((todo) => todo.id === id)

  if (todoIndex !== -1) {
    // 如果标记完成，记录完成时间
    if (updates.completed === true && !db.todos[todoIndex].completedTime) {
      updates.completedTime = new Date().toISOString()
    }
    db.todos[todoIndex] = { ...db.todos[todoIndex], ...updates }
    writeDb(db)
    info(`Updated todo with id: ${id}`)
    return db.todos[todoIndex]
  }

  warn(`Todo with id ${id} not found for update`)
  return null
})

// 批量添加待办事项
ipcMain.handle('bulk-add-todos', async (event, items) => {
  debug(`Handling bulk-add-todos request with ${items.length} items`)
  const db = readDb()
  let successCount = 0

  for (const todo of items) {
    try {
      const newTodo = {
        id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
        title: todo.title,
        completed: todo.completed ?? false,
        priority: todo.priority ?? 0,
        dueDate: todo.dueDate || null,
        startDate: todo.startDate || null,
        content: todo.content || null,
        tags: todo.tags || [],
        list: todo.list || null,
        isAllDay: todo.isAllDay ?? false,
        completedTime: todo.completedTime || null,
        createdAt: todo.createdAt || new Date().toISOString(),
      }
      db.todos.push(newTodo)
      successCount++
    } catch (err) {
      error(`Error adding todo in bulk: ${err.message}`)
    }
  }

  writeDb(db)
  info(`Bulk added ${successCount}/${items.length} todos`)
  return { success: successCount, total: items.length }
})

// ============ CRDT 数据同步相关 IPC ============

/**
 * 导出 CRDT 数据文件（让用户选择保存位置）
 * 用于备份或手动传输到其他设备
 */
ipcMain.handle('export-crdt-file', async (event, data) => {
  debug('Handling export-crdt-file request')
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出数据备份',
      defaultPath: `todo-backup-${new Date().toISOString().slice(0, 10)}.automerge`,
      filters: [
        { name: 'Automerge 数据', extensions: ['automerge'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (!result.canceled && result.filePath) {
      // data 是 base64 编码的 Uint8Array
      const buffer = Buffer.from(data, 'base64')
      fs.writeFileSync(result.filePath, buffer)
      info(`Exported CRDT data to ${result.filePath}`)
      return { success: true, filePath: result.filePath }
    }
    return { success: false, canceled: true }
  } catch (err) {
    error(`Error exporting CRDT file: ${err.message}`)
    return { success: false, error: err.message }
  }
})

/**
 * 导入 CRDT 数据文件（让用户选择要导入的文件）
 */
ipcMain.handle('import-crdt-file', async () => {
  debug('Handling import-crdt-file request')
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入数据备份',
      filters: [
        { name: 'Automerge 数据', extensions: ['automerge'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      const buffer = fs.readFileSync(filePath)
      info(`Importing CRDT data from ${filePath}`)
      return {
        success: true,
        data: buffer.toString('base64'),
        filePath,
      }
    }
    return { success: false, canceled: true }
  } catch (err) {
    error(`Error importing CRDT file: ${err.message}`)
    return { success: false, error: err.message }
  }
})

/**
 * 导出为 JSON（人类可读格式，用于查看/备份）
 */
ipcMain.handle('export-json', async (event, jsonData) => {
  debug('Handling export-json request')
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出 JSON 备份',
      defaultPath: `todos-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, jsonData, 'utf-8')
      info(`Exported JSON to ${result.filePath}`)
      return { success: true, filePath: result.filePath }
    }
    return { success: false, canceled: true }
  } catch (err) {
    error(`Error exporting JSON: ${err.message}`)
    return { success: false, error: err.message }
  }
})

/**
 * 获取 iCloud Drive 路径（macOS）
 */
ipcMain.handle('get-icloud-path', async () => {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const icloudPath = path.join(
    home,
    'Library/Mobile Documents/com~apple~CloudDocs',
  )
  const exists = fs.existsSync(icloudPath)
  return { path: icloudPath, exists }
})

/**
 * 读取/写入 iCloud Drive 中的同步文件
 */
ipcMain.handle('read-icloud-file', async (event, relativePath) => {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const fullPath = path.join(
    home,
    'Library/Mobile Documents/com~apple~CloudDocs',
    relativePath,
  )
  try {
    if (!fs.existsSync(fullPath)) return { success: true, data: null }
    const buffer = fs.readFileSync(fullPath)
    return { success: true, data: buffer.toString('base64') }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('write-icloud-file', async (event, relativePath, base64Data) => {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const fullPath = path.join(
    home,
    'Library/Mobile Documents/com~apple~CloudDocs',
    relativePath,
  )
  try {
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(fullPath, buffer)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

app.whenReady().then(() => {
  info('App is ready')
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  info('All windows closed, quitting app')
  if (process.platform !== 'darwin') app.quit()
})

// 记录应用启动
info('Application started with log level: ' + currentLogLevel)
debug('Debug mode enabled')
