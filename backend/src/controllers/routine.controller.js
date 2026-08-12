const prisma = require("../database/prisma");
const { createRoutineSchema } = require("../schemas/routine.schema");

const createRoutine = async (req, res) => {
  try {
    const validation = createRoutineSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, type } = validation.data;

    const routineItem = await prisma.routineItem.create({
      data: {
        userId: req.user.id,
        name,
        type,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Rotina criada com sucesso.",
      data: routineItem,
    });
  } catch (error) {
    console.error("Erro ao criar rotina:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao criar rotina.",
    });
  }
};

const getRoutines = async (req, res) => {
  try {
    const routines = await prisma.routineItem.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      data: routines,
    });
  } catch (error) {
    console.error("Erro ao buscar rotinas:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar rotinas.",
    });
  }
};

const getRoutineById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "ID da rotina inválido.",
      });
    }

    const routine = await prisma.routineItem.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!routine) {
      return res.status(404).json({
        success: false,
        message: "Rotina não encontrada.",
      });
    }

    return res.status(200).json({
      success: true,
      data: routine,
    });
  } catch (error) {
    console.error("Erro ao buscar rotina:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar rotina.",
    });
  }
};

const updateRoutine = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "ID da rotina inválido.",
      });
    }

    const validation = createRoutineSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, type } = validation.data;

    const routine = await prisma.routineItem.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!routine) {
      return res.status(404).json({
        success: false,
        message: "Rotina não encontrada.",
      });
    }

    const updatedRoutine = await prisma.routineItem.update({
      where: {
        id: routine.id,
      },
      data: {
        name,
        type,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Rotina atualizada com sucesso.",
      data: updatedRoutine,
    });
  } catch (error) {
    console.error("Erro ao atualizar rotina:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao atualizar rotina.",
    });
  }
};

const deleteRoutine = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "ID da rotina inválido.",
      });
    }

    const routine = await prisma.routineItem.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!routine) {
      return res.status(404).json({
        success: false,
        message: "Rotina não encontrada.",
      });
    }

    await prisma.routineItem.delete({
      where: {
        id: routine.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Rotina excluída com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir rotina:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao excluir rotina.",
    });
  }
};

module.exports = {
  createRoutine,
  getRoutines,
  getRoutineById,
  updateRoutine,
  deleteRoutine,
};
