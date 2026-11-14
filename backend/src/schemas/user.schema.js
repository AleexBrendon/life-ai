const { z } = require("zod");
const avatarSchema = z.string().max(260000).refine(value => {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 190000 || bytes.toString('base64') !== match[2]) return false;
  return match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
}, 'Envie uma foto JPEG, PNG ou WebP válida de até 190 KB.').nullable();
const mealTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.');
const mealMinute = value => Number(value.slice(0,2))*60+Number(value.slice(3,5));

const updateUserSchema = z
  .object({
    avatarData: avatarSchema.optional(),
    calendarView: z.enum(['month', 'week', 'day']).optional(),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
    notifyActions: z.boolean().optional(),
    notifyUpcoming: z.boolean().optional(),
    breakfastStart: mealTimeSchema.optional(),
    breakfastEnd: mealTimeSchema.optional(),
    lunchStart: mealTimeSchema.optional(),
    lunchEnd: mealTimeSchema.optional(),
    dinnerStart: mealTimeSchema.optional(),
    dinnerEnd: mealTimeSchema.optional(),
    name: z
      .string()
      .trim()
      .min(2, "O nome deve ter pelo menos 2 caracteres")
      .max(100, "O nome deve ter no máximo 100 caracteres")
      .optional(),

    birthDate: z
      .string()
      .datetime({ offset: true })
      .refine(value => new Date(value).getTime() <= Date.now(), 'A data de nascimento não pode estar no futuro.')
      .nullable()
      .optional(),

    timezone: z
      .string()
      .trim()
      .min(1, "Timezone inválido")
      .max(100, "Timezone inválido")
      .refine(value => { try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }); return true; } catch { return false; } }, 'Escolha um fuso horário válido.')
      .optional(),

    occupation: z
      .string()
      .trim()
      .max(150, "A ocupação deve ter no máximo 150 caracteres")
      .nullable()
      .optional(),

    relationshipStatus: z
      .string()
      .trim()
      .max(50, "Estado civil inválido")
      .nullable()
      .optional(),

    hasChildren: z
      .boolean()
      .optional(),
  })
  .superRefine((data, ctx) => {
    for (const [start, end] of [['breakfastStart','breakfastEnd'],['lunchStart','lunchEnd'],['dinnerStart','dinnerEnd']]) {
      if ((data[start] === undefined) !== (data[end] === undefined)) {
        ctx.addIssue({ code: 'custom', path: [data[start] === undefined ? start : end], message: 'Informe o início e o fim da refeição.' });
      } else if (data[start] !== undefined && data[start] >= data[end]) {
        ctx.addIssue({ code: 'custom', path: [end], message: 'O fim deve ser depois do início.' });
      } else if (data[start] !== undefined && mealMinute(data[end])-mealMinute(data[start])>240) {
        ctx.addIssue({ code: 'custom', path: [end], message: 'A duração da refeição não pode passar de quatro horas.' });
      }
    }
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualizar.",
  });

module.exports = {
  updateUserSchema,
};
