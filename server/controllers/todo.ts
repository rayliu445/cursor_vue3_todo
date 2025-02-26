import { Request, Response } from 'express'
import { TodoService } from '../services/todo'

export class TodoController {
  private todoService = new TodoService()

  async create(req: Request, res: Response) {
    try {
      const { title } = req.body

      // 数据验证
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: '标题不能为空' })
      }

      const todo = await this.todoService.create({
        title,
        completed: false,
        createdAt: new Date(),
      })

      res.json(todo)
    } catch (error) {
      res.status(500).json({ error: '创建任务失败' })
    }
  }

  // ... 其他方法
}
