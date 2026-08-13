const prisma = require("../database/prisma");
const { reminderSchema } = require("../schemas/reminder.schema");

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

module.exports = {
  createReminder,
  getReminders,
  getReminderById,
};