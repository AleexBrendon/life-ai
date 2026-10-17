const prisma = require("../database/prisma");

const {
  routineExecutionSchema,
  skipRoutineExecutionSchema,
} = require("../schemas/routineExecution.schema");

const createRoutineExecution = async (req, res) => {
  try {
    const validation =
      routineExecutionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      routineItemId,
      routineScheduleId,
      date,
      status,
      completedAt,
      skipReason,
    } = validation.data;

    const userId = req.user.id;

    const routineItem =
      await prisma.routineItem.findFirst({
        where: {
          id: routineItemId,
          userId,
        },
      });

    if (!routineItem) {
      return res.status(404).json({
        success: false,
        message: "Rotina não encontrada.",
      });
    }

    if (!routineItem.isActive) {
      return res.status(404).json({
        success: false,
        message: "Rotina não encontrada.",
      });
    }

    const routineSchedule =
      await prisma.routineSchedule.findFirst({
        where: {
          id: routineScheduleId,
          routineItemId,
        },
      });

    if (!routineSchedule) {
      return res.status(404).json({
        success: false,
        message: "Horário da rotina não encontrado.",
      });
    }

    const executionDate = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      )
    );

    const dayOfWeek = executionDate.getUTCDay();

    if (routineSchedule.dayOfWeek !== dayOfWeek) {
      return res.status(400).json({
        success: false,
        message:
          "A data informada não corresponde ao dia da semana da rotina.",
      });
    }

    const existingExecution =
      await prisma.routineExecution.findUnique({
        where: {
          userId_routineScheduleId_date: {
            userId,
            routineScheduleId,
            date: executionDate,
          },
        },
      });

    if (existingExecution) {
      return res.status(409).json({
        success: false,
        message:
          "A execução dessa rotina já foi registrada para esta data.",
      });
    }

    const execution =
      await prisma.routineExecution.create({
        data: {
          userId,
          routineItemId,
          routineScheduleId,
          date: executionDate,


          startTime: routineSchedule.startTime,
          endTime: routineSchedule.endTime,

          status,

          completedAt:
            status === "COMPLETED"
              ? completedAt ?? new Date()
              : null,

          skipReason:
            status === "SKIPPED"
              ? skipReason ?? null
              : null,
        },
      });

    return res.status(201).json({
      success: true,
      message:
        "Execução da rotina registrada com sucesso.",
      data: execution,
    });
  } catch (error) {
    console.error(
      "Erro ao criar execução da rotina:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const getRoutineExecutions = async (req, res) => {
  try {
    const userId = req.user.id;

    const executions =
      await prisma.routineExecution.findMany({
        where: {
          userId,
        },
        include: {
          routineItem: true,
          routineSchedule: true,
        },
        orderBy: [
          {
            date: "desc",
          },
          {
            startTime: "asc",
          },
        ],
      });

    return res.status(200).json({
      success: true,
      data: executions,
    });
  } catch (error) {
    console.error(
      "Erro ao listar execuções das rotinas:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const getRoutineExecutionById = async (req, res) => {
  try {
    const userId = req.user.id;
    const executionId = Number(req.params.id);

    if (
      !Number.isInteger(executionId) ||
      executionId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "ID da execução inválido.",
      });
    }

    const execution =
      await prisma.routineExecution.findFirst({
        where: {
          id: executionId,
          userId,
        },
        include: {
          routineItem: true,
          routineSchedule: true,
        },
      });

    if (!execution) {
      return res.status(404).json({
        success: false,
        message:
          "Execução da rotina não encontrada.",
      });
    }

    return res.status(200).json({
      success: true,
      data: execution,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar execução da rotina:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const completeRoutineExecution = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const executionId = Number(req.params.id);

    if (
      !Number.isInteger(executionId) ||
      executionId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "ID da execução inválido.",
      });
    }

    const execution =
      await prisma.routineExecution.findFirst({
        where: {
          id: executionId,
          userId,
        },
      });

    if (!execution) {
      return res.status(404).json({
        success: false,
        message:
          "Execução da rotina não encontrada.",
      });
    }

    if (execution.status === "COMPLETED") {
      return res.status(409).json({
        success: false,
        message:
          "A execução da rotina já está concluída.",
      });
    }

    if (execution.status === "SKIPPED") {
      return res.status(409).json({
        success: false,
        message:
          "Não é possível concluir uma execução ignorada.",
      });
    }

    if (execution.status === "MISSED") {
      return res.status(409).json({
        success: false,
        message:
          "Não é possível concluir uma execução perdida.",
      });
    }

    const updatedExecution =
      await prisma.routineExecution.update({
        where: {
          id: execution.id,
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Execução da rotina concluída com sucesso.",
      data: updatedExecution,
    });
  } catch (error) {
    console.error(
      "Erro ao concluir execução da rotina:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const skipRoutineExecution = async (req, res) => {
  try {
    const userId = req.user.id;
    const executionId = Number(req.params.id);

    if (
      !Number.isInteger(executionId) ||
      executionId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "ID da execução inválido.",
      });
    }

    const validation =
      skipRoutineExecutionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors:
          validation.error.flatten().fieldErrors,
      });
    }

    const skipReason =
      validation.data.skipReason;

    const execution =
      await prisma.routineExecution.findFirst({
        where: {
          id: executionId,
          userId,
        },
      });

    if (!execution) {
      return res.status(404).json({
        success: false,
        message:
          "Execução da rotina não encontrada.",
      });
    }

    if (execution.status === "COMPLETED") {
      return res.status(409).json({
        success: false,
        message:
          "Não é possível pular uma execução já concluída.",
      });
    }

    if (execution.status === "SKIPPED") {
      return res.status(409).json({
        success: false,
        message:
          "A execução da rotina já foi ignorada.",
      });
    }

    if (execution.status === "MISSED") {
      return res.status(409).json({
        success: false,
        message:
          "Não é possível pular uma execução perdida.",
      });
    }

    const updatedExecution =
      await prisma.routineExecution.update({
        where: {
          id: execution.id,
        },
        data: {
          status: "SKIPPED",
          skipReason,
          completedAt: null,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Execução da rotina ignorada com sucesso.",
      data: updatedExecution,
    });
  } catch (error) {
    console.error(
      "Erro ao ignorar execução da rotina:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const markRoutineExecutionAsMissed = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const executionId = Number(req.params.id);

    if (
      !Number.isInteger(executionId) ||
      executionId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "ID da execução inválido.",
      });
    }

    const execution =
      await prisma.routineExecution.findFirst({
        where: {
          id: executionId,
          userId,
        },
        include: {
          routineSchedule: true,
        },
      });

    if (!execution) {
      return res.status(404).json({
        success: false,
        message:
          "Execução da rotina não encontrada.",
      });
    }

    if (execution.status === "COMPLETED") {
      return res.status(409).json({
        success: false,
        message:
          "Não é possível marcar como perdida uma execução concluída.",
      });
    }

    if (execution.status === "SKIPPED") {
      return res.status(409).json({
        success: false,
        message:
          "Não é possível marcar como perdida uma execução ignorada.",
      });
    }

    if (execution.status === "MISSED") {
      return res.status(409).json({
        success: false,
        message:
          "A execução da rotina já foi marcada como perdida.",
      });
    }

    const executionDate =
      new Date(execution.date);

    const [hours, minutes] =
      execution.routineSchedule.endTime
        .split(":")
        .map(Number);

    const endDateTime =
      new Date(executionDate);

    endDateTime.setUTCHours(
      hours,
      minutes,
      0,
      0
    );

    const now = new Date();

    if (now < endDateTime) {
      return res.status(409).json({
        success: false,
        message:
          "A execução ainda não terminou. Não pode ser marcada como perdida.",
      });
    }

    const updatedExecution =
      await prisma.routineExecution.update({
        where: {
          id: execution.id,
        },
        data: {
          status: "MISSED",
          completedAt: null,
          skipReason: null,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Execução da rotina marcada como perdida.",
      data: updatedExecution,
    });
  } catch (error) {
    console.error(
      "Erro ao marcar execução da rotina como perdida:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};


const completeScheduledRoutine = async (req, res) => {
  try {
    const userId = req.user.id;
    const routineScheduleId = Number(req.params.routineScheduleId);
    const dateInput = req.body?.date;

    if (
      !Number.isInteger(routineScheduleId) ||
      routineScheduleId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Horário de rotina inválido.",
      });
    }

    const parsedDate = new Date(dateInput);

    if (!dateInput || Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Informe uma data válida.",
      });
    }

    // Mantém a mesma convenção de data UTC usada
    // no controller de execução de rotinas.
    const date = new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate()
      )
    );

    const schedule = await prisma.routineSchedule.findFirst({
      where: {
        id: routineScheduleId,
        routineItem: {
          userId,
          isActive: true,
        },
      },
      include: {
        routineItem: true,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Rotina não encontrada ou inativa.",
      });
    }

    if (schedule.dayOfWeek !== date.getUTCDay()) {
      return res.status(400).json({
        success: false,
        message: "A rotina não está programada para essa data.",
      });
    }

    const uniqueKey = {
      userId_routineScheduleId_date: {
        userId,
        routineScheduleId,
        date,
      },
    };

    let execution = await prisma.routineExecution.findUnique({
      where: uniqueKey,
    });

    if (execution?.status === "COMPLETED") {
      return res.status(200).json({
        success: true,
        message: "Rotina já concluída.",
        data: execution,
      });
    }

    if (
      execution &&
      ["SKIPPED", "MISSED"].includes(execution.status)
    ) {
      return res.status(409).json({
        success: false,
        message: "Não é possível concluir uma rotina ignorada ou perdida.",
      });
    }

    if (execution) {
      execution = await prisma.routineExecution.update({
        where: { id: execution.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          skipReason: null,
        },
      });
    } else {
      try {
        execution = await prisma.routineExecution.create({
          data: {
            userId,
            routineItemId: schedule.routineItemId,
            routineScheduleId: schedule.id,
            date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      } catch (error) {
        // Proteção adicional contra duas requisições simultâneas.
        if (error.code !== "P2002") {
          throw error;
        }

        execution = await prisma.routineExecution.findUnique({
          where: uniqueKey,
        });

        if (!execution) {
          throw error;
        }

        if (execution.status === "COMPLETED") {
          return res.status(200).json({
            success: true,
            message: "Rotina já concluída.",
            data: execution,
          });
        }

        if (["SKIPPED", "MISSED"].includes(execution.status)) {
          return res.status(409).json({
            success: false,
            message: "Não é possível concluir uma rotina ignorada ou perdida.",
          });
        }

        execution = await prisma.routineExecution.update({
          where: { id: execution.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            skipReason: null,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Rotina concluída com sucesso.",
      data: execution,
    });
  } catch (error) {
    console.error("Erro ao concluir rotina programada:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao concluir rotina.",
    });
  }
};


module.exports = {
  createRoutineExecution,
  getRoutineExecutions,
  getRoutineExecutionById,
  completeRoutineExecution,
  skipRoutineExecution,
  markRoutineExecutionAsMissed,
  completeScheduledRoutine,
};