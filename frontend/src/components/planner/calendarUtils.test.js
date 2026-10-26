import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarDays,scheduledEvents,shiftDate,localDateKey} from './calendarUtils.js';
import {entities,payload,valuesFor} from './entityConfig.js';
test('calendário cruza meses e anos e começa a semana na segunda',()=>{
 assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
 assert.equal(calendarDays('2026-10-17','month').length,42);
 assert.equal(calendarDays('2026-10-17','week')[0],'2026-10-12');
 assert.equal(calendarDays('2026-10-17','week')[6],'2026-10-18');
 assert.deepEqual(calendarDays('2026-10-17','day'),['2026-10-17']);
 assert.equal(localDateKey(new Date('2026-10-18T01:00:00Z')),'2026-10-17');
});
test('preferências permitem começar no domingo e escolher o fuso do dia',()=>{
 assert.equal(calendarDays('2026-10-17','week',0)[0],'2026-10-11');
 assert.equal(new Date(`${calendarDays('2026-10-17','month',0)[0]}T12:00:00Z`).getUTCDay(),0);
 assert.equal(localDateKey(new Date('2026-10-18T01:00:00Z'),'UTC'),'2026-10-18');
});
test('agenda combina as recorrências e exclui itens inativos e de outras datas',()=>{
 const resources={rotinas:[{id:1,name:'Ativa',schedules:[{id:1,dayOfWeek:6,startTime:'09:00',endTime:'10:00'}]},{id:2,name:'Inativa',isActive:false,schedules:[{id:2,dayOfWeek:6,startTime:'08:00'}]}],lembretes:[{id:1,title:'Diário',recurrence:'DAILY',reminderTime:'08:00'},{id:2,title:'Semanal',recurrence:'WEEKLY',dayOfWeek:6,reminderTime:'11:00'},{id:3,title:'Outro dia',recurrence:'NONE',date:'2026-10-18',reminderTime:'12:00'}],metas:[{id:1,title:'Meta',sessions:[{id:1,date:'2026-10-17T00:00:00Z',startTime:'18:00',endTime:'18:30'}]}]};
 assert.deepEqual(scheduledEvents(resources,'2026-10-17').map(e=>e.title),['Diário','Ativa','Semanal','Meta']);
});
test('formulário aceita novo cadastro e envia somente campos da recorrência escolhida',()=>{
 assert.equal(valuesFor(entities.rotinas.fields,null).isActive,true);
 const values={title:' Teste ',description:'',reminderTime:'10:00',recurrence:'WEEKLY',dayOfWeek:'0',date:'2026-10-17',isActive:true};
 const body=payload(entities.lembretes.fields,values);
 assert.equal(body.title,'Teste');assert.equal(body.dayOfWeek,0);assert.equal(Object.hasOwn(body,'date'),false);
 const goal=payload(entities.metas.fields,valuesFor(entities.metas.fields));assert.equal(goal.targetDate,null);assert.equal(goal.weeklyFrequency,3);
});
test('modal de lembretes recupera o estado salvo e envia o status escolhido',()=>{
 const fields=entities.lembretes.fields;
 assert.equal(valuesFor(fields,{isCompleted:true,isActive:false}).reminderState,'COMPLETED');
 assert.equal(valuesFor(fields,{isCompleted:false,isActive:false}).reminderState,'PAUSED');
 assert.equal(valuesFor(fields,{isActive:true}).reminderState,'ACTIVE');
 assert.equal(payload(fields,{...valuesFor(fields),recurrence:'DAILY',reminderState:'PAUSED'}).reminderState,'PAUSED');
});
test('trabalho agrupa tarefas sem status próprio ou conclusão herdada na agenda',()=>{
 assert.equal(entities.trabalho.fields.some(field=>field.key==='status'),false);
 // O status da tarefa é alterado no Kanban, e não no formulário do trabalho.
 assert.equal(entities.trabalho.children.tasks.fields.some(field=>field.key==='status'),false);
 const resources={trabalho:[{id:1,name:'Empresa',status:'COMPLETED',isActive:true,schedules:[{id:8,dayOfWeek:2,startTime:'08:00',endTime:'12:00'}]}]};
 assert.equal(scheduledEvents(resources,'2026-10-20')[0].status,'PENDING');
});
test('recorrências começam no projeto e na criação de cada cadastro e horário',()=>{
 const resources={rotinas:[{id:1,name:'Rotina',createdAt:'2026-10-17T12:00:00Z',schedules:[{id:2,dayOfWeek:6,startTime:'08:00',createdAt:'2026-10-17T12:00:00Z'},{id:3,dayOfWeek:6,startTime:'09:00',createdAt:'2026-10-20T12:00:00Z'}]}],lembretes:[{id:4,title:'Diário',recurrence:'DAILY',reminderTime:'10:00',createdAt:'2026-10-18T01:00:00Z'}]};
 assert.equal(scheduledEvents(resources,'2026-10-10').length,0);
 assert.equal(scheduledEvents(resources,'2026-10-17').length,2);
 assert.equal(scheduledEvents(resources,'2026-10-24').length,3);
 assert.equal(scheduledEvents(resources,'2026-10-17','UTC').length,1);
});

test('ajuste pontual da IA muda apenas a ocorrência da data correspondente',()=>{
 const resources={rotinas:[{id:1,name:'Estudo',schedules:[{id:4,dayOfWeek:6,startTime:'09:00',endTime:'10:00'}],routineExecutions:[{routineScheduleId:4,date:'2026-10-17T00:00:00Z',startTime:'11:00',endTime:'12:00',status:'PENDING'}]}]};
 assert.equal(scheduledEvents(resources,'2026-10-17')[0].time,'11:00');
 assert.equal(scheduledEvents(resources,'2026-10-24')[0].time,'09:00');
});
