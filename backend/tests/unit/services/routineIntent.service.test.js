import {describe,it,expect} from 'vitest';
const {interpret,intentOf}=require('../../../src/services/routineIntent.service');
const existing=[{id:12,kind:'rotinas',name:'Treino Flauta',category:'Música',weeklyFrequency:3,sessionMinutes:30},{id:7,kind:'rotinas',name:'Corrida',category:'Atividade física'},{id:3,kind:'trabalho',name:'Programação freelancer',category:'Trabalho'},{id:4,kind:'metas',name:'Estudar faculdade EAD',category:'Estudos'},{id:5,kind:'rotinas',name:'Novo treino de violão',category:'Música'}];
const one=(message,list=existing)=>interpret(message,list).activities;
describe('Leitura de pedidos de rotina',()=>{
 it('liga a atividade ao cadastro existente em vez de duplicar',()=>{
  expect(one('Quero treinar flauta 3 vezes por semana, 30 minutos')).toEqual([expect.objectContaining({name:'Treino Flauta',existingId:12,fixed:false,timesPerWeek:3,sessionMinutes:30})]);
  expect(one('Quero correr todos os dias de manhã por 40 minutos')[0]).toMatchObject({existingId:7,timesPerWeek:7,sessionMinutes:40,preferredWindow:[360,720]});
  expect(one('Quero estudar a faculdade 1 hora por dia de segunda a sexta à noite')[0]).toMatchObject({kind:'metas',existingId:4,sessionMinutes:60,allowedDays:[1,2,3,4,5]});
 });
 it('lê jornadas fixas com pausa, sábado diferente e dias agrupados',()=>{
  const [work,freela]=one('Trabalho de segunda a sexta das 8h às 18h com almoço das 12h às 13h e sábado das 8h às 12h. Freela segunda, terça e quinta das 19h às 23h.');
  expect(work).toMatchObject({kind:'trabalho',fixed:true,slots:[{days:[1,2,3,4,5],startTime:'08:00',endTime:'18:00',breakStart:'12:00',breakEnd:'13:00'},{days:[6],startTime:'08:00',endTime:'12:00'}]});
  expect(freela).toMatchObject({kind:'trabalho',existingId:3,slots:[{days:[1,2,4],startTime:'19:00',endTime:'23:00'}]});
 });
 it('lê novas atividades com dias, horário de início, duração e períodos',()=>{
  const [academia,ingles]=one('Adicione academia segunda, quarta e sexta e estudar inglês 2 vezes por semana');
  expect(academia).toMatchObject({name:'Academia',existingId:null,timesPerWeek:3,allowedDays:[1,3,5]});expect(ingles).toMatchObject({name:'Estudar inglês',timesPerWeek:2,sessionMinutes:45});
  const [walk,meditate]=one('Caminhada terça e quinta às 7h, 30 minutos, e meditar 10 minutos todos os dias');
  expect(walk).toMatchObject({fixed:true,slots:[{days:[2,4],startTime:'07:00',endTime:'07:30'}]});expect(meditate).toMatchObject({timesPerWeek:7,sessionMinutes:10});
  expect(one('quero ler 20 min antes de dormir e fazer yoga no fim de semana').map(a=>[a.name,a.preferredWindow,a.allowedDays])).toEqual([['Leitura',[1200,1350],null],['Yoga',null,[6,0]]]);
  expect(one('Quero correr e nadar 3x por semana').map(a=>[a.name,a.timesPerWeek])).toEqual([['Corrida',3],['Natação',3]]);
 });
 it('não confunde palavras genéricas com nomes de cadastros e não executa exclusões',()=>{
  expect(one('Refaça minha rotina considerando os novos itens')).toEqual([]);
  expect(one('Como posso dormir melhor?')).toEqual([]);
  expect(interpret('Remova a corrida de sábado',existing)).toEqual({activities:[],removal:true});
 });
 it('classifica a intenção da mensagem',()=>{
  expect(intentOf('Monte minha rotina com tudo que já cadastrei')).toBe('build');
  expect(intentOf('Reavalie minha rotina cadastrada')).toBe('build');
  expect(intentOf('Organize minha semana por causa do imprevisto')).toBe('week');
  expect(intentOf('Quero comprar um monitor')).toBe('shopping');
  expect(intentOf('Quero treinar flauta 3 vezes por semana')).toBe('other');
 });
});
