const dateKey = date => new Date(date).toISOString().slice(0,10);
const shift = (key, offset) => {const d=new Date(`${key}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);return dateKey(d)};
function localParts(timezone){
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 return date=>{const p=Object.fromEntries(format.formatToParts(date).map(part=>[part.type,part.value]));return {key:`${p.year}-${p.month}-${p.day}`,hour:Number(p.hour),secondOfHour:Number(p.minute)*60+Number(p.second)}};
}
// Time comes only from the Kanban timer: each interval is split by local day and hour, clipped to the period.
function trackTime({taskLogs,byDate,heatmap,now,timezone}){
 const parts=localParts(timezone),perTask=new Map();
 const keys=[...byDate.keys()],lower=new Date(`${shift(keys[0],-1)}T00:00:00Z`).getTime(),upper=new Date(`${shift(keys.at(-1),2)}T00:00:00Z`).getTime();
 for(const log of taskLogs){
  let cursor=Math.max(new Date(log.startedAt).getTime(),lower);const end=Math.min(new Date(log.endedAt||now).getTime(),new Date(now).getTime(),upper);
  while(cursor<end){
   const local=parts(new Date(cursor)),step=Math.min(end-cursor,(3600-local.secondOfHour)*1000-cursor%1000),day=byDate.get(local.key);
   if(day){const seconds=step/1000;day.seconds+=seconds;heatmap[(new Date(`${local.key}T00:00:00Z`).getUTCDay()+6)%7].seconds[local.hour]+=seconds;
    const key=log.taskId,row=perTask.get(key)||{taskId:key,title:log.task?.title||'Tarefa',job:log.task?.job?.name||'',status:log.task?.status||null,seconds:0};row.seconds+=seconds;perTask.set(key,row)}
   cursor+=Math.max(step,1);
  }
 }
 return [...perTask.values()].map(({seconds,...row})=>({...row,minutes:Math.round(seconds/60)})).filter(row=>row.minutes>0).sort((a,b)=>b.minutes-a.minutes);
}
function buildInsights({endDate,days,routines=[],reminders=[],sessions=[],taskLogs=[],now=new Date(),timezone='America/Sao_Paulo'}) {
 const startDate=shift(endDate,1-days);
 const daily=Array.from({length:days},(_,index)=>({date:shift(startDate,index),total:0,completed:0,seconds:0}));
 const byDate=new Map(daily.map(day=>[day.date,day]));const categories=new Map();
 const heatmap=Array.from({length:7},(_,day)=>({day,seconds:Array(24).fill(0)}));
 const add=(row,category)=>{
  const key=dateKey(row.date),day=byDate.get(key);if(!day)return;day.total++;
  if(row.status!=='COMPLETED')return;day.completed++;categories.set(category,(categories.get(category)||0)+1);
 };
 routines.forEach(row=>add(row,row.routineItem?.type||'Rotinas'));
 reminders.forEach(row=>add(row,'Lembretes'));sessions.forEach(row=>add(row,'Metas'));
 const tasks=trackTime({taskLogs,byDate,heatmap,now,timezone});
 const completed=daily.reduce((sum,day)=>sum+day.completed,0),total=daily.reduce((sum,day)=>sum+day.total,0),minutes=Math.round(daily.reduce((sum,day)=>sum+day.seconds,0)/60);
 const activeDays=daily.filter(day=>day.total>0||day.seconds>0).length;
 return {startDate,endDate,days,summary:{completed,total,rate:total?Math.round(completed/total*100):0,minutes,activeDays},daily:daily.map(({seconds,...day})=>({...day,minutes:Math.round(seconds/60),rate:day.total?Math.round(day.completed/day.total*100):null})),categories:Array.from(categories,([name,value])=>({name,value})),heatmap:heatmap.map(row=>({day:row.day,hours:row.seconds.map(seconds=>Math.round(seconds/60))})),tasks};
}
function resolveInsightRange(input,today){
 const {validDate}=require('./financeBills.service');
 const fail=message=>{throw Object.assign(new Error(message),{status:400})};
 const range=typeof input==='number'?{days:input}:input||{};
 if(!!range.startDate!==!!range.endDate)fail('Informe as datas inicial e final.');
 const days=range.startDate?Math.round((new Date(range.endDate+'T00:00:00Z')-new Date(range.startDate+'T00:00:00Z'))/86400000)+1:Number(range.days??7);
 if(!Number.isInteger(days)||days<1||days>365)fail('Escolha um período de 1 a 365 dias.');
 const endDate=range.endDate||today,startDate=range.startDate||shift(endDate,1-days);
 if(!validDate(startDate)||!validDate(endDate))fail('Informe datas válidas.');
 if(endDate>today)fail('O histórico pode ser consultado até hoje.');
 return {startDate,endDate,days};
}
async function getInsights(userId,input){
 const prisma=require('../database/prisma');
 const profile=await prisma.profile.findUnique({where:{userId},select:{timezone:true}}),now=new Date();let timezone=profile?.timezone||'America/Sao_Paulo';try{new Intl.DateTimeFormat('en',{timeZone:timezone})}catch{timezone='America/Sao_Paulo'}
 const today=require('./personalPlanning.service').localClock(now,timezone).date;
 const {startDate,endDate,days}=resolveInsightRange(input,today);const date={gte:new Date(`${startDate}T00:00:00Z`),lt:new Date(`${shift(endDate,1)}T00:00:00Z`)};
 // Generous UTC window; trackTime clips each interval to the local period.
 const windowStart=new Date(`${shift(startDate,-1)}T00:00:00Z`),windowEnd=new Date(`${shift(endDate,2)}T00:00:00Z`);
 const [routines,reminders,sessions,taskLogs]=await Promise.all([
 prisma.routineExecution.findMany({where:{userId,date},select:{date:true,status:true,startTime:true,endTime:true,routineItem:{select:{type:true}}}}),
 prisma.reminderExecution.findMany({where:{userId,date},select:{date:true,status:true}}),
 prisma.goalPlanSession.findMany({where:{goal:{userId},date},select:{date:true,status:true,startTime:true,endTime:true}}),
 prisma.jobTaskTimeLog.findMany({where:{userId,startedAt:{lt:windowEnd},OR:[{endedAt:null},{endedAt:{gt:windowStart}}]},select:{taskId:true,startedAt:true,endedAt:true,task:{select:{title:true,status:true,job:{select:{name:true}}}}}}),
 ]);
 return buildInsights({endDate,days,routines,reminders,sessions,taskLogs,now,timezone});
}
module.exports={buildInsights,getInsights,resolveInsightRange};
