const { dashboardQuerySchema } = require("../schemas/dashboard.schema");
const { getDashboard } = require("../services/dashboard.service");

const dashboard = async (req, res) => {
    try {
        const validation = dashboardQuerySchema.safeParse(req.query);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos.",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const data = await getDashboard({
            userId: req.user.id,
            date: validation.data.date,
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao carregar dashboard.",
        });
    }
};

module.exports = {
    dashboard,
};