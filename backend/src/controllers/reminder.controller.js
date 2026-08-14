const prisma = require("../database/prisma");
const {
  reminderSchema,
  updateReminderSchema,
} = require("../schemas/reminder.schema");

const createReminder = async (req, res) => {
  try {
    const validation = reminderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      title,
      description,
      reminderTime,
      date,
      dayOfWeek,
      recurrence,
    } = validation.data;

    const userId = req.user.id;

    const reminder = await prisma.reminder.create({
      data: {
        userId,
        title,
        description: description ?? null,
        reminderTime,
        date: date ?? null,
        dayOfWeek: dayOfWeek ?? null,
        recurrence,
        isCompleted: false,
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Lembrete criado com sucesso.",
      data: reminder,
    });
  } catch (error) {
    console.error("Erro ao criar lembrete:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const getReminders = async (req, res) => {
  try {
    const userId = req.user.id;

    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          reminderTime: "asc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error("Erro ao listar lembretes:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const getReminderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = Number(req.params.id);

    if (!Number.isInteger(reminderId)) {
      return res.status(400).json({
        success: false,
        message: "ID do lembrete inválido.",
      });
    }

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error("Erro ao buscar lembrete:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const updateReminder = async (req, res) => {
  try {
    const validation = updateReminderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const userId = req.user.id;
    const reminderId = Number(req.params.id);

    if (!Number.isInteger(reminderId)) {
      return res.status(400).json({
        success: false,
        message: "ID do lembrete inválido.",
      });
    }

    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!existingReminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado.",
      });
    }

    const data = validation.data;

    const updateData = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.reminderTime !== undefined) {
      updateData.reminderTime = data.reminderTime;
    }

    if (data.date !== undefined) {
      updateData.date = data.date;
    }

    if (data.dayOfWeek !== undefined) {
      updateData.dayOfWeek = data.dayOfWeek;
    }

    if (data.recurrence !== undefined) {
      updateData.recurrence = data.recurrence;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const reminder = await prisma.reminder.update({
      where: {
        id: reminderId,
      },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Lembrete atualizado com sucesso.",
      data: reminder,
    });
  } catch (error) {
    console.error("Erro ao atualizar lembrete:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = Number(req.params.id);

    if (!Number.isInteger(reminderId)) {
      return res.status(400).json({
        success: false,
        message: "ID do lembrete inválido.",
      });
    }

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado.",
      });
    }

    await prisma.reminder.delete({
      where: {
        id: reminderId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Lembrete excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir lembrete:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const completeReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = Number(req.params.id);

    if (!Number.isInteger(reminderId)) {
      return res.status(400).json({
        success: false,
        message: "ID do lembrete inválido.",
      });
    }

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado.",
      });
    }

    if (reminder.isCompleted) {
      return res.status(400).json({
        success: false,
        message: "O lembrete já está concluído.",
      });
    }

    const updatedReminder = await prisma.reminder.update({
      where: {
        id: reminderId,
      },
      data: {
        isCompleted: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Lembrete concluído com sucesso.",
      data: updatedReminder,
    });
  } catch (error) {
    console.error("Erro ao concluir lembrete:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const activateReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = Number(req.params.id);

    if (!Number.isInteger(reminderId)) {
      return res.status(400).json({
        success: false,
        message: "ID do lembrete inválido.",
      });
    }

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado.",
      });
    }

    if (reminder.isActive) {
      return res.status(409).json({
        success: false,
        message: "O lembrete já está ativo.",
      });
    }

    const updatedReminder = await prisma.reminder.update({
      where: {
        id: reminderId,
      },
      data: {
        isActive: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Lembrete ativado com sucesso.",
      data: updatedReminder,
    });
  } catch (error) {
    console.error("Erro ao ativar lembrete:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

const deactivateReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = Number(req.params.id);

    if (!Number.isInteger(reminderId)) {
      return res.status(400).json({
        success: false,
        message: "ID do lembrete inválido.",
      });
    }

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado.",
      });
    }

    if (!reminder.isActive) {
      return res.status(409).json({
        success: false,
        message: "O lembrete já está inativo.",
      });
    }

    const updatedReminder = await prisma.reminder.update({
      where: {
        id: reminderId,
      },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Lembrete desativado com sucesso.",
      data: updatedReminder,
    });
  } catch (error) {
    console.error("Erro ao desativar lembrete:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

module.exports = {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  completeReminder,
  activateReminder,
  deactivateReminder,
};