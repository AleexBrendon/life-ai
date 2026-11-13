const { z } = require("zod");

const recommendationRequestSchema = z.object({
    date: z.string().date("Informe uma data real no formato YYYY-MM-DD."),
});

const recommendationListSchema = z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

module.exports = {
    recommendationRequestSchema,
    recommendationListSchema,
};
