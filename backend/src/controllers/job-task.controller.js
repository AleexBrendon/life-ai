
const prisma = require("../database/prisma");
const {
  createJobTaskSchema,
  updateJobTaskSchema,
} = require("../schemas/job-task.schema");

async function findOwnedJob(jobId, userId) {
  if (!Number.isInteger(jobId) || jobId <= 0) return null;

  return prisma.job.findFirst({
    where: { id: jobId, userId },
    select: { id: true },
  });
}

const getTasks = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const job = await findOwnedJob(jobId, req.user.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    const tasks = await prisma.jobTask.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar tarefas.",
    });
  }
};

const createTask = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const job = await findOwnedJob(jobId, req.user.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    const validation = createJobTaskSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const task = await prisma.jobTask.create({
      data: {
        jobId: job.id,
        title: validation.data.title,
        ...(validation.data.description !== undefined && {
          description: validation.data.description,
        }),
        ...(validation.data.status !== undefined && {
          status: validation.data.status,
        }),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Tarefa criada com sucesso.",
      data: task,
    });
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao criar tarefa.",
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const taskId = Number(req.params.taskId);

    const job = await findOwnedJob(jobId, req.user.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID da tarefa inválido.",
      });
    }

    const validation = updateJobTaskSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingTask = await prisma.jobTask.findFirst({
      where: { id: taskId, jobId: job.id },
      select: { id: true },
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada.",
      });
    }

    const task = await prisma.jobTask.update({
      where: { id: existingTask.id },
      data: validation.data,
    });

    return res.status(200).json({
      success: true,
      message: "Tarefa atualizada com sucesso.",
      data: task,
    });
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao atualizar tarefa.",
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const taskId = Number(req.params.taskId);

    const job = await findOwnedJob(jobId, req.user.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID da tarefa inválido.",
      });
    }

    const task = await prisma.jobTask.findFirst({
      where: { id: taskId, jobId: job.id },
      select: { id: true },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada.",
      });
    }

    await prisma.jobTask.delete({ where: { id: task.id } });

    return res.status(200).json({
      success: true,
      message: "Tarefa excluída com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao excluir tarefa.",
    });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
