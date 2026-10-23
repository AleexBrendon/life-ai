const prisma=require('../database/prisma');
const {createHash}=require('crypto');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function routineAssessment(userId,{weekStart,weekEnd,previousInventory}={},db=prisma){
 const [routines,jobs,goals,reminders,unexpected]=await Promise.all([
  db.routineItem.findMany({where:{userId},orderBy:{id:'asc'},include:{schedules:{orderBy:{id:'asc'}},_count:{select:{schedules:true}}}}),
  db.job.findMany({where:{userId},orderBy:{id:'asc'},include:{schedules:{orderBy:{id:'asc'}},tasks:{orderBy:{id:'asc'}},_count:{select:{schedules:true,tasks:true}}}}),
  db.goal.findMany({where:{userId},orderBy:{id:'asc'},include:{sessions:{orderBy:{id:'asc'}},_count:{select:{sessions:weekStart&&weekEnd?{where:{date:{gte:new Date(weekStart+'T00:00:00Z'),lte:new Date(weekEnd+'T00:00:00Z')}}}:true}}}}),
  db.reminder.findMany({where:{userId},orderBy:{id:'asc'}}),
  db.unexpectedEvent.findMany({where:{userId},orderBy:{id:'asc'}})
 ]);
 const activeRoutines=routines.filter(r=>r.isActive),activeJobs=jobs.filter(r=>r.isActive),activeGoals=goals.filter(r=>r.status==='ACTIVE');
 const findings=[];
 const missing=(rows,key,label,kind)=>{const without=rows.filter(r=>!r._count[key]),manual=without.filter(r=>!r.autoSchedule),auto=without.filter(r=>r.autoSchedule);if(manual.length)findings.push({kind,message:`${manual.length} ${label} sem horários cadastrados: ${manual.map(r=>r.name||r.title).join(', ')}. Cadastre os horários ou marque “Deixar a IA definir o horário” para incluí-los na agenda.`});if(auto.length)findings.push({kind,message:`${auto.length} ${label} aguardando horário definido pela IA: ${auto.map(r=>r.name||r.title).join(', ')}. Confira os novos horários sugeridos nas alternativas abaixo.`})};
 missing(activeRoutines,'schedules','rotina(s) ativa(s)','rotinas');missing(activeJobs,'schedules','trabalho(s) ativo(s)','trabalho');missing(activeGoals,'sessions','meta(s) ativa(s) nesta semana','metas');
 if(activeRoutines.length&&!activeRoutines.some(r=>r.isFlexible||r.autoSchedule))findings.push({kind:'rotinas',message:'Todas as rotinas ativas estão fixas. Para receber sugestões de mudança de horário, habilite “Permitir reorganização pela IA” nas rotinas que podem mudar.'});
 if(!activeRoutines.length)findings.push({kind:'rotinas',message:'Nenhuma rotina ativa cadastrada. Descreva seus hábitos em Cadastrar rotina para preparar uma proposta.'});
 const inventory=[];
 const add=(kind,rows,title,describe)=>rows.forEach(row=>inventory.push({key:kind+':'+row.id,kind,title:row[title],detail:describe(row),description:row.description||'',revision:hash(row)}));
 const days=['dom','seg','ter','qua','qui','sex','sáb'];
 const times=rows=>rows.map(r=>days[r.dayOfWeek]+' '+r.startTime+'–'+r.endTime).join('; ');
 add('rotinas',routines,'name',r=>!r.isActive?'Inativa':(r.autoSchedule?'Horário definido pela IA':r.isFlexible?'Flexível':'Horário fixo')+' · '+(times(r.schedules)||(r.autoSchedule?'Sem horário: a IA vai sugerir na reavaliação':'Sem horário: ainda não entra na agenda')));
 add('trabalho',jobs,'name',r=>!r.isActive?'Inativo':times(r.schedules)||'Sem jornada cadastrada');
 add('tarefas',jobs.flatMap(job=>job.tasks.map(t=>({...t,jobName:job.name}))),'title',r=>r.jobName+' · '+r.status+' · Sem horário próprio; organizada no Kanban');
 add('metas',goals,'title',r=>r.status+' · '+r.priority+' · '+r.weeklyFrequency+' sessões/semana de '+r.sessionMinutes+' min · '+r._count.sessions+' sessão(ões) nesta semana'+(r.autoSchedule?' · Horário definido pela IA':'')+(r.targetDate?' · Prazo '+r.targetDate.toISOString().slice(0,10):''));
 add('lembretes',reminders,'title',r=>(r.isCompleted?'Concluído':r.isActive?'Ativo':'Pausado')+' · '+r.reminderTime+' · '+r.recurrence+(r.dayOfWeek!=null?' · '+days[r.dayOfWeek]:'')+(r.date?' · '+r.date.toISOString().slice(0,10):''));
 add('imprevistos',unexpected,'title',r=>r.status+' · '+r.date.toISOString().slice(0,10)+' '+r.startTime+'–'+r.endTime);
 const previous=new Map((previousInventory||[]).map(row=>[row.key,row])),current=new Map(inventory.map(row=>[row.key,row]));
 const changes={baseline:!Array.isArray(previousInventory),added:[],updated:[],removed:[]};
 if(!changes.baseline){for(const row of inventory){const old=previous.get(row.key);if(!old)changes.added.push(row);else if(old.revision!==row.revision)changes.updated.push(row)}for(const row of previous.values())if(!current.has(row.key))changes.removed.push(row)}
 return {inventory,inventoryFingerprint:hash(inventory),changes,checkedAt:new Date().toISOString(),counts:{routines:routines.length,activeRoutines:activeRoutines.length,flexibleRoutines:activeRoutines.filter(r=>r.isFlexible).length,jobs:jobs.length,activeJobs:activeJobs.length,tasks:jobs.reduce((sum,r)=>sum+r._count.tasks,0),goals:goals.length,activeGoals:activeGoals.length,reminders:reminders.length,activeReminders:reminders.filter(r=>r.isActive&&!r.isCompleted).length,pendingUnexpected:unexpected.filter(r=>r.status==='PENDING').length},findings};
}
module.exports={routineAssessment};
