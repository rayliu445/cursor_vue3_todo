const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

// 使用中间件
server.use(middlewares)
server.use(jsonServer.bodyParser)

// 自定义路由
server.post('/api/todos', (req, res) => {
  const { title } = req.body

  // 生成新的todo
  const newTodo = {
    id: Date.now().toString(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  }

  // 获取当前数据
  const db = router.db
  const todos = db.get('todos').value()

  // 添加新todo
  db.get('todos').push(newTodo).write()

  res.json(newTodo)
})

// 使用路由
server.use(router)

// 启动服务器
server.listen(3001, () => {
  console.log('JSON Server is running on port 3001')
})
