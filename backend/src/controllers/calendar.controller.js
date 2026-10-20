const { getDashboard } = require('../services/dashboard.service');
async function calendar(req,res,todayOnly=false) {
 try {
  const date = todayOnly ? undefined : req.query.date;
  if(date !== undefined) {
   const parsed = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date+'T00:00:00Z') : null;
   if(!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10)!==date) return res.status(400).json({success:false,message:'Data inválida. Use o formato YYYY-MM-DD.'});
  }
  const data=await getDashboard({userId:req.user.id,date});
  const status=(kind,id)=>data.activities.find(row=>row.kind===kind&&row.sourceId===id)?.status||'PENDING';
  const items=[
   ...data.routines.scheduled.flatMap(routine=>routine.schedules.map(schedule=>{const execution=data.routines.executions.find(row=>row.routineScheduleId===schedule.id);return {type:'ROUTINE',id:routine.id,routineScheduleId:schedule.id,title:routine.name,startTime:execution?.startTime||schedule.startTime,endTime:execution?.endTime||schedule.endTime,status:status('rotinas',schedule.id),priority:null}})),
   ...data.reminders.scheduled.map(row=>({type:'REMINDER',id:row.id,title:row.title,startTime:row.reminderTime,endTime:null,status:status('lembretes',row.id),priority:null})),
   ...data.work.map(row=>({type:'WORK',id:row.id,jobId:row.jobId,title:row.job.name,startTime:row.startTime,endTime:row.endTime,breakStart:row.breakStart,breakEnd:row.breakEnd,status:status('trabalho',row.id),priority:null})),
   ...data.goals.sessions.map(row=>({type:'GOAL_SESSION',id:row.id,goalId:row.goalId,title:row.goal.title,startTime:row.startTime,endTime:row.endTime,status:status('metas',row.id),priority:row.goal.priority})),
   ...data.unexpectedEvents.map(row=>({type:'UNEXPECTED_EVENT',id:row.id,title:row.title,startTime:row.startTime,endTime:row.endTime,status:status('imprevistos',row.id),priority:row.priority})),
  ].sort((a,b)=>a.startTime.localeCompare(b.startTime));
  return res.json({success:true,data:{date:data.date+'T00:00:00.000Z',items}});
 }catch(error){console.error('Erro ao buscar calendário:',error.code||error.name);return res.status(500).json({success:false,message:'Não foi possível carregar o calendário.'})}
}
module.exports={getCalendar:(req,res)=>calendar(req,res),getTodayCalendar:(req,res)=>calendar(req,res,true)};
