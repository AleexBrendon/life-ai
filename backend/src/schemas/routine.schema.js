const { z } = require("zod");

const createRoutineSchema = z.object({
  locationMode: z.enum(['REMOTE','ONSITE']).nullable().optional(),
  ...require('../services/commitmentTiming.service').timingFields,
  travelDuringBreak: z.boolean().optional(),
  autoSchedule: z.boolean().optional(),
  weeklyFrequency: z.number().int().min(1).max(7).optional(),
  sessionMinutes: z.number().int().min(15).max(240).optional(),
  isFlexible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  name: z
    .string()
    .trim()
    .min(1, "O nome da rotina é obrigatório.")
    .max(100, "O nome da rotina deve ter no máximo 100 caracteres."),

  type: z
    .string()
    .trim()
    .min(1, "O tipo da rotina é obrigatório.")
    .max(50, "O tipo da rotina deve ter no máximo 50 caracteres."),
}).superRefine((data,ctx)=>{
  if(data.locationMode==='ONSITE')for(const key of ['outboundMinutes','returnMinutes'])if(data[key]==null)ctx.addIssue({code:'custom',path:[key],message:'Informe os minutos de deslocamento para a rotina presencial (0 quando não houver).'});
}).overwrite(data=>data.locationMode==='REMOTE'?{...data,outboundMinutes:0,returnMinutes:0,travelDuringBreak:false}:data);

module.exports = {
  createRoutineSchema,
};
