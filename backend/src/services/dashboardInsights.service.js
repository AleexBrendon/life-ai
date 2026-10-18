const dateKey = date => new Date(date).toISOString().slice(0,10);
const shift = (key, offset) => {const d=new Date(`${key}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);return dateKey(d)};
function buildInsights({endDate,days,routines=[],reminders=[],sessions=[]}) {
 const startDate=shift(endDate,1-days);
 const daily=Array.from({length:days},(_,index)=>({date:shift(startDate,index),total:0,completed:0,minutes:0}));
 const byDate=new Map(daily.map(day=>[day.date,day]));const categories=new Map();
 const heatmap=Array.from({length:7},(_,day)=>({day,hours:Array(24).fill(0)}));
 const duration=(start,end)=>{const minute=value=>{const [h,m]=String(value).split(':').map(Number);return h*60+m};const a=minute(start),b=minute(end);return Number.isFinite(a)&&Number.isFinite(b)&&b>a?{a,b}:null};
 const add=(row,category,withTime)=>{
  const key=dateKey(row.date),day=byDate.get(key);if(!day)return;day.total++;
  if(row.status!=='COMPLETED')return;day.completed++;categories.set(category,(categories.get(category)||0)+1);
  const interval=withTime?duration(row.startTime,row.endTime):null;
  if(!interval)return;day.minutes+=interval.b-interval.a;
  const weekday=(new Date(`${key}T00:00:00Z`).getUTCDay()+6)%7;
  for(let hour=0;hour<24;hour++)heatmap[weekday].hours[hour]+=Math.max(0,Math.min(interval.b,(hour+1)*60)-Math.max(interval.a,hour*60));
 };
 routines.forEach(row=>add(row,row.routineItem?.type||'Rotinas',true));
 reminders.forEach(row=>add(row,'Lembretes',false));sessions.forEach(row=>add(row,'Metas',true));
 const completed=daily.reduce((sum,day)=>sum+day.completed,0),total=daily.reduce((sum,day)=>sum+day.total,0),minutes=daily.reduce((sum,day)=>sum+day.minutes,0);
 const activeDays=daily.filter(day=>day.total>0).length;
 return {startDate,endDate,days,summary:{completed,total,rate:total?Math.round(completed/total*100):0,minutes,activeDays},daily:daily.map(day=>({...day,rate:day.total?Math.round(day.completed/day.total*100):null})),categories:Array.from(categories,([name,value])=>({name,value})),heatmap};
}
async function getInsights(userId,days){
 const prisma=require('../database/prisma');
 const endDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const startDate=shift(endDate,1-days);const date={gte:new Date(`${startDate}T00:00:00Z`),lt:new Date(`${shift(endDate,1)}T00:00:00Z`)};
 const [routines,reminders,sessions]=await Promise.all([
 prisma.routineExecution.findMany({where:{userId,date},select:{date:true,status:true,startTime:true,endTime:true,routineItem:{select:{type:true}}}}),
 prisma.reminderExecution.findMany({where:{userId,date},select:{date:true,status:true}}),
 prisma.goalPlanSession.findMany({where:{goal:{userId},date},select:{date:true,status:true,startTime:true,endTime:true}}),
 ]);
 return buildInsights({endDate,days,routines,reminders,sessions});
}
module.exports={buildInsights,getInsights};
