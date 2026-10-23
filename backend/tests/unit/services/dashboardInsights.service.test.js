import {describe,it,expect} from 'vitest';
const {buildInsights}=require('../../../src/services/dashboardInsights.service');
const date='2026-10-17T00:00:00Z';
const task={title:'API de pagamentos',status:'IN_PROGRESS',job:{name:'Freelancer'}};
describe('Gráficos do dashboard',()=>{
 it('mantém dias sem registros como lacunas e não fabrica dados',()=>{
  const result=buildInsights({endDate:'2026-10-17',days:7});expect(result.daily).toHaveLength(7);expect(result.daily.every(d=>d.rate===null)).toBe(true);expect(result.summary.completed).toBe(0);expect(result.summary.minutes).toBe(0);expect(result.categories).toEqual([]);expect(result.tasks).toEqual([]);
 });
 it('calcula conclusão e categorias, mas o tempo vem só das tarefas do Kanban',()=>{
  const result=buildInsights({endDate:'2026-10-17',days:7,now:new Date('2026-10-17T23:00:00Z'),routines:[{date,status:'COMPLETED',startTime:'08:30',endTime:'09:15',routineItem:{type:'Saúde'}},{date,status:'PENDING',startTime:'10:00',endTime:'11:00'}],reminders:[{date,status:'COMPLETED'}],sessions:[{date,status:'COMPLETED',startTime:'18:00',endTime:'18:30'}],
   taskLogs:[{taskId:1,task,startedAt:new Date('2026-10-17T11:30:00Z'),endedAt:new Date('2026-10-17T12:15:00Z')},{taskId:1,task,startedAt:new Date('2026-10-17T21:00:00Z'),endedAt:new Date('2026-10-17T21:30:00Z')}]});
  expect(result.summary).toEqual({completed:3,total:4,rate:75,minutes:75,activeDays:1});
  // 11:30Z is 08:30 in São Paulo; Saturday is index 5.
  expect(result.heatmap[5].hours[8]).toBe(30);expect(result.heatmap[5].hours[9]).toBe(15);expect(result.heatmap[5].hours[18]).toBe(30);
  expect(result.tasks).toEqual([{taskId:1,title:'API de pagamentos',job:'Freelancer',status:'IN_PROGRESS',minutes:75}]);expect(result.categories.reduce((n,c)=>n+c.value,0)).toBe(3);
 });
 it('conta o tempo ainda em andamento até agora e corta o que está fora do período',()=>{
  const result=buildInsights({endDate:'2026-10-17',days:7,now:new Date('2026-10-17T13:00:00Z'),taskLogs:[{taskId:2,task,startedAt:new Date('2026-10-11T02:00:00Z'),endedAt:new Date('2026-10-11T04:00:00Z')},{taskId:3,task,startedAt:new Date('2026-10-17T12:00:00Z'),endedAt:null}]});
  // 02:00Z on 11/10 is 23:00 of 10/10 locally: only the hour after midnight is inside the period.
  expect(result.daily[0].minutes).toBe(60);expect(result.daily[6].minutes).toBe(60);expect(result.summary.minutes).toBe(120);expect(result.startDate).toBe('2026-10-11');
 });
 it('exclui conclusões fora do período',()=>{
  const result=buildInsights({endDate:'2026-10-17',days:7,routines:[{date:'2026-10-01',status:'COMPLETED',startTime:'08:00',endTime:'09:00'},{date,status:'COMPLETED',startTime:'18:00',endTime:'17:00'}]});expect(result.summary.completed).toBe(1);expect(result.summary.minutes).toBe(0);
 });
});
