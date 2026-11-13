const { z } = require('zod');
const { getDashboard } = require('./dashboard.service');
const { agendaRows, shiftDay } = require('./agendaProjection.service');
const { localClock, minutes } = require('./personalPlanning.service');
const { timing } = require('./commitmentTiming.service');
const { json, hash, fail, recordChange } = require('./changeHistory.service');
const { PROJECT_START } = require('../utils/agendaStart');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const requestSchema = z.object({
  kind: z.enum(['rotinas','metas','imprevistos','lembretes']), sourceId: z.number().int().positive().max(2147483647),
  date: z.string().date().max(10), toDate: z.string().date().refine(value => value <= '2099-12-30', 'Escolha uma data até 30/12/2099.'), startTime: time, endTime: time,
}).strict().refine(value => value.kind === 'lembretes' ? value.startTime === value.endTime : value.startTime < value.endTime, { message: 'Informe um intervalo válido; lembretes usam o mesmo horário no início e fim.' });
const dateKey = date => date.toISOString().slice(0,10);
const clock = minute => `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;

async function scheduleSnapshot(db, userId, kind, sourceId, date) {
  const day = new Date(date + 'T00:00:00Z');
  if (kind === 'rotinas') return {
    slot: await db.routineSchedule.findFirst({ where: { id: sourceId, routineItem: { userId } }, include: { routineItem: true } }),
    row: await db.routineExecution.findFirst({ where: { userId, routineScheduleId: sourceId, date: day } }),
  };
  if (kind === 'metas') return { row: await db.goalPlanSession.findFirst({ where: { id: sourceId, goal: { userId } }, include: { goal: true } }) };
  if (kind === 'imprevistos') return { row: await db.unexpectedEvent.findFirst({ where: { id: sourceId, userId } }) };
  return { row: await db.reminder.findFirst({ where: { id: sourceId, userId } }) };
}

// Half-open intervals: touching endpoints are allowed. Point reminders occupy one minute.
function overlaps(first, second) {
  return first.start < second.end && second.start < first.end;
}
async function context(db, userId, input, now) {
  const source = await scheduleSnapshot(db, userId, input.kind, input.sourceId, input.date);
  if (!(input.kind === 'rotinas' ? source.slot : source.row)) fail('Atividade não encontrada.', 404);
  const original = await getDashboard({ userId, date: input.date, db });
  const occurrence = original.activities.find(row => row.kind === input.kind && row.sourceId === input.sourceId);
  if (!occurrence) fail('A atividade não está programada nesta data.', 404);
  if (occurrence.status !== 'PENDING') fail('Somente atividades pendentes podem ser reagendadas.');
  if (input.kind === 'rotinas' && input.date !== input.toDate) fail('Ajustes pontuais de rotinas mantêm a data. Para mudar os dias da série, use o planejamento.', 400);
  if (input.kind === 'lembretes' && source.row.recurrence !== 'NONE') fail('Para mudar um lembrete recorrente, edite a série no planejamento.', 400);
  if (input.kind === 'lembretes' && input.date !== input.toDate && await db.reminderExecution.count({ where: { userId, reminderId: input.sourceId } })) fail('Este lembrete já possui registros de execução. Revise o cadastro antes de mudar a data.');
  if (input.kind === 'imprevistos' && input.date !== input.toDate && await db.activityExecution.count({ where: { userId, kind: input.kind, sourceId: input.sourceId, date: { in: [new Date(input.date+'T00:00:00Z'),new Date(input.toDate+'T00:00:00Z')] } } })) fail('Este compromisso já possui registros de execução nessas datas. Revise o cadastro antes de mudar a data.');
  const local = localClock(now, original.timezone);
  if (input.toDate < PROJECT_START || input.toDate < local.date || input.toDate === local.date && minutes(input.startTime) <= local.minute) fail('Escolha um horário futuro no fuso do seu perfil.', 400);
  const ownTiming = input.kind === 'rotinas' ? timing(source.slot.routineItem) : { beforeMinutes: 0, afterMinutes: 0 };
  const days = await Promise.all([-1,0,1].map(offset => getDashboard({ userId, date: shiftDay(input.toDate, offset), db })));
  const occupied = days.flatMap((day, index) => agendaRows(day).filter(row => !['SKIPPED','MISSED'].includes(row.status) && !(row.kind === input.kind && row.sourceId === input.sourceId)).map(row => ({
    ...row, start: (index-1)*1440 + minutes(row.startTime) - (row.beforeMinutes || 0),
    end: (index-1)*1440 + Math.max(minutes(row.endTime), minutes(row.startTime)+1) + (row.afterMinutes || 0),
  })));
  const span = (start, end) => ({ start: start - ownTiming.beforeMinutes, end: Math.max(end,start+1) + ownTiming.afterMinutes });
  const target = span(minutes(input.startTime), minutes(input.endTime));
  if (target.start < 0 || target.end > 1440) fail('O intervalo, incluindo preparo e deslocamento, precisa caber no mesmo dia.', 400);
  const conflicts = occupied.filter(row => overlaps(target,row)).map(({kind,sourceId,title,date,startTime,endTime}) => ({kind,sourceId,title,date,startTime,endTime}));
  const duration = minutes(input.endTime)-minutes(input.startTime), suggestions=[];
  const starts = [];
  for(let start=7*60;start+Math.max(duration,1)<=23*60;start+=15) {
    const candidate=span(start,start+duration);
    if(candidate.start<0||candidate.end>1440||input.toDate===local.date&&start<=local.minute)continue;
    if(occupied.every(row=>!overlaps(candidate,row)))starts.push(start);
  }
  starts.sort((a,b)=>Math.abs(a-minutes(input.startTime))-Math.abs(b-minutes(input.startTime))||a-b);
  for(const start of starts.slice(0,3))suggestions.push({toDate:input.toDate,startTime:clock(start),endTime:clock(start+duration)});
  return { source, original, conflicts, suggestions, fingerprint: hash({ source, original, days }) };
}

async function writeSchedule(db, userId, input, source) {
  const date = new Date(input.toDate+'T00:00:00Z');
  if (input.kind === 'rotinas') {
    await db.routineExecution.upsert({ where: { userId_routineScheduleId_date: { userId, routineScheduleId: input.sourceId, date } },
      create: { userId, routineItemId: source.slot.routineItemId, routineScheduleId: input.sourceId, date, startTime: input.startTime, endTime: input.endTime, status: 'PENDING' },
      update: { startTime: input.startTime, endTime: input.endTime } });
  } else if(input.kind==='metas') await db.goalPlanSession.update({where:{id:input.sourceId},data:{date,startTime:input.startTime,endTime:input.endTime}});
  else if(input.kind==='imprevistos') await db.unexpectedEvent.update({where:{id:input.sourceId},data:{date,startTime:input.startTime,endTime:input.endTime}});
  else await db.reminder.update({where:{id:input.sourceId},data:{date,reminderTime:input.startTime}});
}

function createRescheduleService(db, { now = () => new Date() } = {}) {
  return {
    async preview(userId, value) {
      const input = requestSchema.parse(value);
      return db.$transaction(async tx => {
        const state = await context(tx,userId,input,now());
        const expired = await tx.scheduleChangePreview.findMany({where:{userId,expiresAt:{lte:now()}},select:{id:true},take:100});
        if(expired.length)await tx.scheduleChangePreview.deleteMany({where:{userId,id:{in:expired.map(row=>row.id)}}});
        if(await tx.scheduleChangePreview.count({where:{userId,status:'PENDING'}})>=30)fail('Há muitas prévias abertas. Aguarde a expiração antes de gerar outra.',429);
        const stage=await tx.scheduleChangePreview.create({data:{userId,input,fingerprint:state.fingerprint,expiresAt:new Date(now().getTime()+10*60*1000)}});
        return {id:stage.id,input,conflicts:state.conflicts,suggestions:state.suggestions,expiresAt:stage.expiresAt};
      },{isolationLevel:'Serializable',timeout:20000});
    },
    async apply(userId,id,allowConflicts=false) {
      z.boolean().parse(allowConflicts);
      return db.$transaction(async tx=>{
        const stage=await tx.scheduleChangePreview.findFirst({where:{id,userId}});
        if(!stage)fail('Prévia não encontrada.',404);
        if(stage.status==='APPLIED')return {id,alreadyApplied:true};
        if(stage.expiresAt<=now())fail('Esta prévia expirou. Gere uma nova.');
        const input=requestSchema.parse(stage.input),state=await context(tx,userId,input,now());
        if(state.fingerprint!==stage.fingerprint)fail('A agenda mudou. Gere uma nova prévia antes de reagendar.');
        if(state.conflicts.length&&!allowConflicts)fail('Revise e confirme os conflitos antes de aplicar.');
        await writeSchedule(tx,userId,input,state.source);
        const after=await scheduleSnapshot(tx,userId,input.kind,input.sourceId,input.toDate);
        const event=await recordChange(tx,{userId,action:'RESCHEDULE',kind:input.kind,sourceId:input.sourceId,date:input.date,before:{snapshot:state.source,input},after:{snapshot:after,input},reversible:true});
        await tx.scheduleChangePreview.update({where:{id},data:{status:'APPLIED'}});
        return {id,alreadyApplied:false,changeId:event?.id};
      },{isolationLevel:'Serializable',timeout:20000});
    },
  };
}

async function undoReschedule(db,userId,event) {
  const input=event.after.input;
  const current=await scheduleSnapshot(db,userId,event.kind,event.sourceId,input.toDate);
  if(hash(current)!==hash(event.after.snapshot))fail('O compromisso mudou depois do reagendamento. Revise o histórico.');
  const old=event.before.snapshot;
  const row=old.row || old.slot;
  const previousStart=event.kind==='lembretes'?row.reminderTime:row.startTime;
  const previousEnd=event.kind==='lembretes'?row.reminderTime:row.endTime;
  const reverse={...input,date:input.toDate,toDate:input.date,startTime:previousStart,endTime:previousEnd};
  const state=await context(db,userId,reverse,new Date());
  if(state.conflicts.length)fail('O horário anterior agora possui conflitos. Use uma nova prévia para reagendar.');
  if(event.kind==='rotinas'&&!old.row)await db.routineExecution.delete({where:{id:current.row.id}});
  else await writeSchedule(db,userId,reverse,state.source);
  return {snapshot:await scheduleSnapshot(db,userId,event.kind,event.sourceId,input.date),input:reverse};
}
module.exports={createRescheduleService,requestSchema,undoReschedule,overlaps};
