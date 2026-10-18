import test from 'node:test';
import assert from 'node:assert/strict';
import { hydrationAlarm } from './hydrationAlarm.js';
const data = { date:'2026-10-17',timezone:'America/Sao_Paulo',totalMl:250,plan:{id:5,enabled:true,goalMl:2000,startTime:'08:00',endTime:'20:00',intervalMinutes:60} };
test('contagem regressiva segue o fuso e muda a chave apenas no próximo intervalo',()=>{
 const first=hydrationAlarm(data,new Date('2026-10-17T11:15:30Z'));
 assert.equal(first.state,'active');assert.equal(first.label,'Próximo em 00:44:30');
 assert.equal(first.key,hydrationAlarm(data,new Date('2026-10-17T11:59:59Z')).key);
 assert.notEqual(first.key,hydrationAlarm(data,new Date('2026-10-17T12:00:00Z')).key);
});
test('mostra horas separadas dos minutos e segundos, inclusive antes do primeiro aviso',()=>{
 assert.equal(hydrationAlarm(data,new Date('2026-10-17T03:00:00Z')).label,'Próximo em 08:00:00');
 assert.equal(hydrationAlarm(data,new Date('2026-10-17T11:00:00Z')).label,'Próximo em 01:00:00');
 assert.equal(hydrationAlarm({...data,plan:{...data.plan,intervalMinutes:120}},new Date('2026-10-17T11:15:30Z')).label,'Próximo em 01:44:30');
 assert.equal(hydrationAlarm(data,new Date('2026-10-17T11:59:59Z')).label,'Próximo em 00:00:01');
});
test('não dispara antes da janela, depois dela, desativado ou na meta',()=>{
 assert.equal(hydrationAlarm(data,new Date('2026-10-17T10:30:00Z')).state,'waiting');
 assert.equal(hydrationAlarm(data,new Date('2026-10-18T01:00:00Z')).state,'outside');
 assert.equal(hydrationAlarm({...data,totalMl:2000},new Date('2026-10-17T12:00:00Z')).state,'complete');
 assert.equal(hydrationAlarm({...data,plan:{...data.plan,enabled:false}}).state,'disabled');
});
test('aguarda dados atualizados na virada do dia e respeita o último intervalo',()=>{
 assert.equal(hydrationAlarm(data,new Date('2026-10-18T03:00:00Z')).state,'refresh');
 assert.equal(hydrationAlarm(data,new Date('2026-10-17T23:00:00Z')).label,'Amanhã às 08:00');
});
