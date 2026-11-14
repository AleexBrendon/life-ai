import {it,expect} from 'vitest';
const {getDashboard}=require('../../../src/services/dashboard.service');

it('exposes an approved off-cycle reminder as a dated occurrence',async()=>{
 const reminder={id:8,userId:2,title:'Enviar documento',reminderTime:'18:00',recurrence:'WEEKLY',dayOfWeek:6,isActive:true,createdAt:new Date('2026-10-17T12:00:00Z')};
 const execution={id:41,userId:2,reminderId:8,date:new Date('2026-10-18T00:00:00Z'),status:'PENDING',reminder};
 const empty=async()=>[];
 const db={
  profile:{findUnique:async()=>({timezone:'UTC'})},
  routineItem:{findMany:empty},
  routineExecution:{findMany:empty},
  reminder:{findMany:empty},
  reminderExecution:{findMany:async()=>[execution]},
  workSchedule:{findMany:empty},
  unexpectedEvent:{findMany:empty},
  goalPlanSession:{findMany:empty},
  activityExecution:{findMany:empty},
 };

 const result=await getDashboard({userId:2,date:'2026-10-18',now:new Date('2026-10-17T12:00:00Z'),db});

 expect(result.reminders.scheduled).toContainEqual(expect.objectContaining({id:8,recurrence:'NONE',oneOffDate:'2026-10-18'}));
 expect(result.activities).toContainEqual(expect.objectContaining({kind:'lembretes',sourceId:8,status:'PENDING'}));
});
