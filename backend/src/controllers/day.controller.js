const prisma = require("../database/prisma");

const getToday = async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();

    const dayOfWeek = today.getDay();

    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const executions = await prisma.routineExecution.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const routines = await prisma.routineSchedule.findMany({
      where: {
        dayOfWeek,
        routineItem: {
          userId,
          isActive: true,
        },
      },
      include: {
        routineItem: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const items = routines.map((schedule) => {
      const execution = executions.find(
        (item) => item.routineScheduleId === schedule.id
      );

      return {
        routineItemId: schedule.routineItemId,
        routineScheduleId: schedule.id,
        name: schedule.routineItem.name,
        type: schedule.routineItem.type,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: execution?.status ?? "PENDING",
        executionId: execution?.id ?? null,
        completedAt: execution?.completedAt ?? null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        date: startOfDay,
        items,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar rotina do dia:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor.",
    });
  }
};

module.exports = {
  getToday,
};