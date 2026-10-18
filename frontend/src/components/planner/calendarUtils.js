export const localDateKey = (date = new Date(), timezone = 'America/Sao_Paulo') => new Intl.DateTimeFormat('en-CA', {timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function shiftDate(key, days) { const date=new Date(`${key}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10); }
export function calendarDays(key, view='month', weekStartsOn=1) {
 const date=new Date(`${key}T12:00:00Z`);
 if(view==='day')return [key];
 if(view==='week'){const first=shiftDate(key,-((date.getUTCDay()-weekStartsOn+7)%7));return Array.from({length:7},(_,i)=>shiftDate(first,i));}
 date.setUTCDate(1);const first=date.toISOString().slice(0,10);const start=shiftDate(first,-((date.getUTCDay()-weekStartsOn+7)%7));return Array.from({length:42},(_,i)=>shiftDate(start,i));
}
export function scheduledEvents(resources,key){
 const weekday=new Date(`${key}T12:00:00Z`).getUTCDay();const rows=[];
 for(const [kind,items]of Object.entries(resources)) for(const item of items){
  if(item.isActive===false)continue;
  const add=(row,time,end)=>rows.push({key:`${kind}-${item.id}-${row.id||''}`,kind,parent:item,sourceId:row.id,time,end,title:item.name||item.title,status:row.status||item.status});
  if(kind==='rotinas'||kind==='trabalho')for(const schedule of item.schedules||[])if(schedule.dayOfWeek===weekday){const execution=kind==='rotinas'?item.routineExecutions?.find(row=>row.routineScheduleId===schedule.id&&row.date.slice(0,10)===key):null;add({...schedule,status:execution?.status||schedule.status},execution?.startTime||schedule.startTime,execution?.endTime||schedule.endTime);}
  if(kind==='metas')for(const session of item.sessions||[])if(session.date.slice(0,10)===key)add(session,session.startTime,session.endTime);
  if(kind==='lembretes'&&(item.recurrence==='DAILY'||item.recurrence==='WEEKLY'&&item.dayOfWeek===weekday||item.recurrence==='NONE'&&item.date?.slice(0,10)===key))add(item,item.reminderTime);
  if(kind==='imprevistos'&&item.date.slice(0,10)===key)add(item,item.startTime,item.endTime);
 }
 return rows.sort((a,b)=>a.time.localeCompare(b.time));
}


