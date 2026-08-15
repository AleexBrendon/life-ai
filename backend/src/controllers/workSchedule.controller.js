const prisma = require("../database/prisma");
const {
  createWorkScheduleSchema,
  updateWorkScheduleSchema,
} = require("../schemas/workSchedule.schema");

const createWorkSchedule = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);

    if (!Number.isInteger(jobId)) {
      return res.status(400).json({
        success: false,
        message: "ID do trabalho inválido.",
      });
    }

    const validation = createWorkScheduleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      dayOfWeek,
      startTime,
      endTime,
      breakStart,
      breakEnd,
    } = validation.data;

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    const conflictingSchedule = await prisma.workSchedule.findFirst({
      where: {
        jobId: job.id,
        dayOfWeek,
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
    });

    if (conflictingSchedule) {
      return res.status(409).json({
        success: false,
        message: "Já existe um horário de trabalho nesse período.",
      });
    }

    const workSchedule = await prisma.workSchedule.create({
      data: {
        jobId: job.id,
        dayOfWeek,
        startTime,
        endTime,
        breakStart,
        breakEnd,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Horário de trabalho criado com sucesso.",
      data: workSchedule,
    });
  } catch (error) {
    console.error("Erro ao criar horário de trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao criar horário de trabalho.",
    });
  }
};

const getWorkSchedules = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);

    if (!Number.isInteger(jobId)) {
      return res.status(400).json({
        success: false,
        message: "ID do trabalho inválido.",
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    const schedules = await prisma.workSchedule.findMany({
      where: {
        jobId: job.id,
      },
      orderBy: [
        {
          dayOfWeek: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("Erro ao buscar horários de trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar horários de trabalho.",
    });
  }
};

const getWorkScheduleById = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const scheduleId = Number(req.params.scheduleId);

    if (!Number.isInteger(jobId) || !Number.isInteger(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido.",
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    const schedule = await prisma.workSchedule.findFirst({
      where: {
        id: scheduleId,
        jobId: job.id,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Horário de trabalho não encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error("Erro ao buscar horário de trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar horário de trabalho.",
    });
  }
};

const updateWorkSchedule = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const scheduleId = Number(req.params.scheduleId);

    if (!Number.isInteger(jobId) || !Number.isInteger(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido.",
      });
    }

    const validation = updateWorkScheduleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      dayOfWeek,
      startTime,
      endTime,
      breakStart,
      breakEnd,
    } = validation.data;

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    const schedule = await prisma.workSchedule.findFirst({
      where: {
        id: scheduleId,
        jobId: job.id,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Horário de trabalho não encontrado.",
      });
    }

    const conflictingSchedule = await prisma.workSchedule.findFirst({
      where: {
        id: {
          not: schedule.id,
        },
        jobId: job.id,
        dayOfWeek,
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
    });

    if (conflictingSchedule) {
      return res.status(409).json({
        success: false,
        message: "Já existe um horário de trabalho nesse período.",
      });
    }

    const updatedSchedule = await prisma.workSchedule.update({
      where: {
        id: schedule.id,
      },
      data: {
        dayOfWeek,
        startTime,
        endTime,
        breakStart,
        breakEnd,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Horário de trabalho atualizado com sucesso.",
      data: updatedSchedule,
    });
  } catch (error) {
    console.error("Erro ao atualizar horário de trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao atualizar horário de trabalho.",
    });
  }
};

const deleteWorkSchedule = async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const scheduleId = Number(req.params.scheduleId);

    if (!Number.isInteger(jobId) || !Number.isInteger(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido.",
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    const schedule = await prisma.workSchedule.findFirst({
      where: {
        id: scheduleId,
        jobId: job.id,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Horário de trabalho não encontrado.",
      });
    }

    await prisma.workSchedule.delete({
      where: {
        id: schedule.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Horário de trabalho excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir horário de trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao excluir horário de trabalho.",
    });
  }
};

module.exports = {
  createWorkSchedule,
  getWorkSchedules,
  getWorkScheduleById,
  updateWorkSchedule,
  deleteWorkSchedule,
};