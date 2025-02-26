import express from 'express'
import cors from 'cors'
import { TodoController } from './controllers/todo'

const app = express()
app.use(cors())
app.use(express.json())

const todoController = new TodoController()

// 路由
app.get('/api/todos', todoController.getAll)
app.post('/api/todos', todoController.create)
app.patch('/api/todos/:id', todoController.update)
app.delete('/api/todos/:id', todoController.delete)

app.listen(3001, () => {
  console.log('Server is running on port 3001')
})
