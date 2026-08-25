const { z } = require("zod");

const recommendationRequestSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data deve estar no formato YYYY-MM-DD."),
});

const recommendationListSchema = z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

module.exports = {
    recommendationRequestSchema,
    recommendationListSchema,
};
