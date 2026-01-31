const jsonServer = require('json-server')
const path = require('path')
const fs = require('fs')

// 创建服务器实例
const server = jsonServer.create()

// 设置中间件
server.use(jsonServer.defaults())

// 创建路由器并指定数据文件
const dbPath = path.join(__dirname, '../db.json')
const router = jsonServer.router(dbPath)
server.use(router)

// 启动服务器
const port = 3001
server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`)
})

module.exports = server
