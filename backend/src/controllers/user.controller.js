const prisma = require("../database/prisma");

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,

        profile: {
          select: {
            id: true,
            birthDate: true,
            timezone: true,
            occupation: true,
            relationshipStatus: true,
            hasChildren: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar perfil do usuário.",
    });
  }
};

const updateMe = async (req, res) => {
  try {
    const {
      name,
      birthDate,
      timezone,
      occupation,
      relationshipStatus,
      hasChildren,
    } = req.body;

    const userData = {};

    if (name !== undefined) {
      userData.name = name;
    }

    const profileData = {};

    if (birthDate !== undefined) {
      profileData.birthDate = birthDate
        ? new Date(birthDate)
        : null;
    }

    if (timezone !== undefined) {
      profileData.timezone = timezone;
    }

    if (occupation !== undefined) {
      profileData.occupation = occupation;
    }

    if (relationshipStatus !== undefined) {
      profileData.relationshipStatus = relationshipStatus;
    }

    if (hasChildren !== undefined) {
      profileData.hasChildren = hasChildren;
    }

    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        ...userData,

        ...(Object.keys(profileData).length > 0
          ? {
              profile: {
                upsert: {
                  create: profileData,
                  update: profileData,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,

        profile: {
          select: {
            id: true,
            birthDate: true,
            timezone: true,
            occupation: true,
            relationshipStatus: true,
            hasChildren: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Perfil atualizado com sucesso.",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil do usuário:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao atualizar perfil do usuário.",
    });
  }
};

module.exports = {
  getMe,
  updateMe,
};