const { app, BrowserWindow, ipcMain } = require('electron')
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

// 数据存储文件路径
const dbPath = path.join(app.getPath('userData'), 'db.json')

// 确保数据文件存在
function ensureDbExists() {
  if (!fs.existsSync(dbPath)) {
    info('Database does not exist, creating new one')
    fs.writeFileSync(dbPath, JSON.stringify({ todos: [] }))
  } else {
    debug('Database file exists')
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
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
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

  // 判断是否为生产环境
  const isProduction = app.isPackaged

  info(
    'Application environment: ' + (isProduction ? 'production' : 'development'),
  )

  // 根据环境加载不同内容
  if (isProduction) {
    const indexPath = path.join(__dirname, 'dist/index.html')
    info('Loading packaged app from: ' + indexPath)

    if (!fs.existsSync(indexPath)) {
      error('ERROR: Index file does not exist at path: ' + indexPath)
    } else {
      info('SUCCESS: Index file exists at path: ' + indexPath)
    }

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

ipcMain.handle('add-todo', async (event, todo) => {
  debug(`Handling add-todo request: ${JSON.stringify(todo)}`)
  const db = readDb()
  const newTodo = {
    id: Date.now().toString(),
    title: todo.title,
    completed: false,
    createdAt: new Date().toISOString(),
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
    db.todos[todoIndex] = { ...db.todos[todoIndex], ...updates }
    writeDb(db)
    info(`Updated todo with id: ${id}`)
    return db.todos[todoIndex]
  }

  warn(`Todo with id ${id} not found for update`)
  return null
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
