const prisma = require('../database/prisma');
const { getDashboard } = require('./dashboard.service');
const { localClock, minutes } = require('./personalPlanning.service');

function upcomingItems(day) {
 const status = (kind, id) => day.activities.find(row => row.kind === kind && row.sourceId === id)?.status;
 const rows = [
  ...day.routines.scheduled.flatMap(parent => parent.schedules.map(row => ({ kind:'rotinas', id:row.id, title:parent.name, time:day.routines.executions.find(execution=>execution.routineScheduleId===row.id)?.startTime || row.startTime }))),
  ...day.work.map(row=>({kind:'trabalho',id:row.id,title:row.job.name,time:row.startTime})),
  ...day.reminders.scheduled.map(row=>({kind:'lembretes',id:row.id,title:row.title,time:row.reminderTime})),
  ...day.goals.sessions.map(row=>({kind:'metas',id:row.id,title:row.goal.title,time:row.startTime})),
  ...day.unexpectedEvents.map(row=>({kind:'imprevistos',id:row.id,title:row.title,time:row.startTime})),
 ];
 return rows.filter(row=>status(row.kind,row.id)==='PENDING');
}
async function getUpcomingActivities(userId, now = new Date(), knownProfile) {
 const profile = knownProfile === undefined ? await prisma.profile.findUnique({where:{userId},select:{timezone:true,notifyUpcoming:true}}) : knownProfile;
 if(profile?.notifyUpcoming===false)return [];
 let clock;try{clock=localClock(now,profile?.timezone)}catch{clock=localClock(now)}
 const dates=[clock.date],result=[];
 if(clock.minute>=1435){const tomorrow=new Date(clock.date+'T00:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);dates.push(tomorrow.toISOString().slice(0,10))}
 for(const [offset,date] of dates.entries()){
  const day=await getDashboard({userId,date,now});
  for(const item of upcomingItems(day)){
   const remaining=(offset*1440+minutes(item.time)-clock.minute)*60000-now.getUTCSeconds()*1000-now.getUTCMilliseconds();
   if(remaining<=0||remaining>300000)continue;
   result.push({...item,sourceId:item.id,date,remainingMs:remaining,startsAt:new Date(now.getTime()+remaining).toISOString(),key:`upcoming:${userId}:${item.kind}:${item.id}:${date}:${item.time}`});
  }
 }
 return result.sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
}
async function sendUpcomingNotifications(now = new Date(), onlyUserId) {
 const users=await prisma.user.findMany({where:{...(onlyUserId?{id:onlyUserId}:{}),OR:[{profile:{is:null}},{profile:{is:{notifyUpcoming:true}}}]},select:{id:true,profile:{select:{timezone:true,notifyUpcoming:true}}}});
 for(const user of users){
  const items=await getUpcomingActivities(user.id,now,user.profile);
  for(const item of items){
   if(item.remainingMs<=240000)continue;
   await prisma.notification.upsert({where:{dedupKey:item.key},update:{},create:{userId:user.id,dedupKey:item.key,type:'UPCOMING',priority:'HIGH',title:`Em 5 minutos · ${item.title.slice(0,100)}`,message:`${item.title.slice(0,150)} começa às ${item.time} em ${item.date.split('-').reverse().join('/')}. Abra a atividade para acompanhar na agenda.`,entityType:item.kind,entityId:item.id,scheduledAt:new Date(item.startsAt)}});
  }
 }
}
function startUpcomingNotifications() {
 let running=false;
 const tick=async()=>{if(running)return;running=true;try{await sendUpcomingNotifications()}catch(error){console.error('Falha nos avisos de início:',error.code||error.name)}finally{running=false}};
 tick();const timer=setInterval(tick,30000);timer.unref();return timer;
}
module.exports={getUpcomingActivities,sendUpcomingNotifications,startUpcomingNotifications};
