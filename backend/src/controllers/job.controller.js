const prisma = require("../database/prisma");
const { createJobSchema } = require("../schemas/job.schema");

const createJob = async (req, res) => {
  try {
    const validation = createJobSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      name,
      company,
      position,
      workType,
      location,
      isActive,
    } = validation.data;

    const job = await prisma.job.create({
      data: {
        userId: req.user.id,
        name,
        company,
        position,
        workType,
        location,
        ...(isActive !== undefined && { isActive }),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Trabalho criado com sucesso.",
      data: job,
    });
  } catch (error) {
    console.error("Erro ao criar trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao criar trabalho.",
    });
  }
};

const getJobs = async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error("Erro ao buscar trabalhos:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar trabalhos.",
    });
  }
};

const getJobById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "ID do trabalho inválido.",
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Erro ao buscar trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar trabalho.",
    });
  }
};

const updateJob = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "ID do trabalho inválido.",
      });
    }

    const validation = createJobSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      name,
      company,
      position,
      workType,
      location,
      isActive,
    } = validation.data;

    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    const updatedJob = await prisma.job.update({
      where: {
        id: job.id,
      },
      data: {
        name,
        company,
        position,
        workType,
        location,
        ...(isActive !== undefined && { isActive }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Trabalho atualizado com sucesso.",
      data: updatedJob,
    });
  } catch (error) {
    console.error("Erro ao atualizar trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao atualizar trabalho.",
    });
  }
};

const deleteJob = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "ID do trabalho inválido.",
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Trabalho não encontrado.",
      });
    }

    await prisma.job.delete({
      where: {
        id: job.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Trabalho excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir trabalho:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao excluir trabalho.",
    });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
};