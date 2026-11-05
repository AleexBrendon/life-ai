const { z } = require('zod');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
 const parsed = new Date(value + 'T00:00:00Z');
 return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const plannerQuerySchema = z.object({
 limit: z.coerce.number().int().min(1).max(100).optional(),
 offset: z.coerce.number().int().min(0).max(100000).optional(),
 from: date.optional(), to: date.optional(),
}).refine(value => !value.from || !value.to || value.from <= value.to, 'Período inválido.');
function executionDateFilter(query) {
 return query.from || query.to ? { date: { ...(query.from ? { gte: new Date(query.from + 'T00:00:00Z') } : {}), ...(query.to ? { lte: new Date(query.to + 'T00:00:00Z') } : {}) } } : {};
}
module.exports = { plannerQuerySchema, executionDateFilter };
