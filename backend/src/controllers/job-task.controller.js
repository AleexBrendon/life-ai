const {
  createJobTaskSchema,
  updateJobTaskSchema,
  moveJobTaskSchema,
  reorderJobTaskSchema,
} = require("../schemas/job-task.schema");
const tasks = require("../services/jobTask.service");

function handle(action, fallback, { schema, status = 200, message } = {}) {
  return async (req, res) => {
    let body;
    if (schema) {
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: validation.error.issues[0]?.message || "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        });
      }
      body = validation.data;
    }
    try {
      const data = await action(req.user.id, Number(req.params.jobId), Number(req.params.taskId), body);
      return res.status(status).json({ success: true, ...(message ? { message } : {}), ...(data !== undefined ? { data } : {}) });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ success: false, message: error.message });
      if (error.code === "P2034") return res.status(409).json({ success: false, message: "A tarefa recebeu outra alteração. Atualize e tente novamente." });
      console.error(fallback, error);
      return res.status(500).json({ success: false, message: `Erro interno ao ${fallback}.` });
    }
  };
}

const getTasks = handle((userId, jobId) => tasks.listTasks(userId, jobId), "buscar tarefas");
const createTask = handle((userId, jobId, _taskId, body) => tasks.createTask(userId, jobId, body), "criar tarefa", { schema: createJobTaskSchema, status: 201, message: "Tarefa criada com sucesso." });
const updateTask = handle((userId, jobId, taskId, body) => tasks.updateTask(userId, jobId, taskId, body), "atualizar tarefa", { schema: updateJobTaskSchema, message: "Tarefa atualizada com sucesso." });
const startTask = handle((userId, jobId, taskId) => tasks.startTask(userId, jobId, taskId), "iniciar tarefa", { message: "Tempo iniciado." });
const pauseTask = handle((userId, jobId, taskId) => tasks.pauseTask(userId, jobId, taskId), "pausar tarefa", { message: "Tempo pausado." });
const moveTask = handle((userId, jobId, taskId, body) => tasks.moveTask(userId, jobId, taskId, body), "mover tarefa", { schema: moveJobTaskSchema, message: "Tarefa movida." });
const reorderTask = handle((userId, jobId, taskId, body) => tasks.reorderTask(userId, jobId, taskId, body), "reordenar tarefa", { schema: reorderJobTaskSchema });
const deleteTask = handle(async (userId, jobId, taskId) => { await tasks.deleteTask(userId, jobId, taskId); }, "excluir tarefa", { message: "Tarefa excluída com sucesso." });

module.exports = {
  getTasks,
  createTask,
  updateTask,
  startTask,
  pauseTask,
  moveTask,
  reorderTask,
  deleteTask,
};
