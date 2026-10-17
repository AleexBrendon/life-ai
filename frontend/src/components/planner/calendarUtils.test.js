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
