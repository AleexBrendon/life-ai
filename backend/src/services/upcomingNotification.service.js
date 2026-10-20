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
async function sendUpcomingNotifications(now = new Date(), onlyUserId) {
 const users = await prisma.user.findMany({ where: { ...(onlyUserId ? { id:onlyUserId } : {}), OR:[{profile:{is:null}},{profile:{is:{notifyUpcoming:true}}}] }, select:{id:true,profile:{select:{timezone:true}}} });
 for (const user of users) {
  let clock;try{clock=localClock(now,user.profile?.timezone)}catch{clock=localClock(now)}
  const dates=[clock.date];
  if(clock.minute>=1435){const tomorrow=new Date(`${clock.date}T00:00:00Z`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);dates.push(tomorrow.toISOString().slice(0,10))}
  for(const [offset,date] of dates.entries()) {
   const day=await getDashboard({userId:user.id,date,now});
   for(const item of upcomingItems(day)) {
    const remaining=(offset*1440+minutes(item.time)-clock.minute)*60000-now.getUTCSeconds()*1000-now.getUTCMilliseconds();
    if(remaining<=240000 || remaining>300000)continue;
    const dedupKey=`upcoming:${user.id}:${item.kind}:${item.id}:${date}:${item.time}`;
    await prisma.notification.upsert({where:{dedupKey},update:{},create:{userId:user.id,dedupKey,type:'UPCOMING',priority:'HIGH',title:`Em 5 minutos · ${item.title.slice(0,100)}`,message:`${item.title.slice(0,150)} começa às ${item.time} em ${date.split('-').reverse().join('/')}. Abra a atividade para acompanhar na agenda.`,entityType:item.kind,entityId:item.id,scheduledAt:new Date(now.getTime()+remaining)}});
   }
  }
 }
}
function startUpcomingNotifications() {
 let running=false;
 const tick=async()=>{if(running)return;running=true;try{await sendUpcomingNotifications()}catch(error){console.error('Falha nos avisos de início:',error.code||error.name)}finally{running=false}};
 tick();const timer=setInterval(tick,30000);timer.unref();return timer;
}
module.exports={sendUpcomingNotifications,startUpcomingNotifications};
