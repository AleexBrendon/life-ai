import test from 'node:test';
import assert from 'node:assert/strict';
import { countdown } from './upcomingCountdown.js';
const start='2026-10-21T03:02:00.000Z',timestamp=new Date(start).getTime();
test('conta de cinco minutos até o início sem acumular atraso de timer',()=>{
 assert.equal(countdown(start,timestamp-300000).text,'05:00');
 assert.equal(countdown(start,timestamp-299000).text,'04:59');
 assert.equal(countdown(start,timestamp-63000).text,'01:03');
 assert.equal(countdown(start,timestamp-1).text,'00:01');
 assert.equal(countdown(start,timestamp),null);
});
test('descarta horários inválidos, fora da janela ou já iniciados',()=>{
 assert.equal(countdown('inválido',timestamp),null);
 assert.equal(countdown(start,timestamp-300001),null);
 assert.equal(countdown(start,timestamp+1000),null);
});
test('a contagem usa o instante absoluto mesmo quando cruza a meia-noite local',()=>{
 assert.equal(countdown(start,new Date('2026-10-21T02:57:00Z').getTime()).text,'05:00');
 assert.equal(countdown(start,new Date('2026-10-21T03:01:30Z').getTime()).text,'00:30');
});
