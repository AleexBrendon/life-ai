import {describe,it,expect} from 'vitest';
const {extractFixedCommitments,localSchedulePlan,readDays}=require('../../../src/services/localSchedule.service');
const {validateItems}=require('../../../src/services/aiSetup.service');
const text='Exemplo fictício: trabalho de segunda a sexta das 8 hrs até 12 hrs e das 14 hrs até as 18 hrs na EmpresaExemplo. Também trabalho como programador Freelancer às segundas-terças-quintas das 19hrs até as 23 hrs. Sábado trabalho das 8hrs até as 12 hrs e dou aula de música das 15 hrs até as 17 hrs. Tenho atividade pessoal toda quarta às 19:30hrs até as 21 hrs e domingo das 18:30 até as 20:30. Quero encaixar faculdade EAD, corrida e descanso.';
describe('Planejamento gratuito local',()=>{
 it('respeita corrida diária explícita e inclui flauta como rotina flexível',()=>{
  const plan=localSchedulePlan('Adicione corrida todos os dias e treino de flauta. Quero encaixar mais tempo de estudo.','2026-10-21');
  const items=validateItems(plan.items);expect(items.find(i=>i.data.name==='Corrida').data.schedules).toHaveLength(7);expect(items.find(i=>i.data.name==='Corrida').data.isFlexible).toBe(true);expect(items.find(i=>i.data.name==='Treinar flauta').data.isFlexible).toBe(true);expect(items.find(i=>i.kind==='metas').data.sessions).toHaveLength(5);
 });
 it('preserva turnos divididos, freelancer, sábado e compromissos pessoais',()=>{
  const fixed=extractFixedCommitments(text);expect(fixed).toHaveLength(4);expect(fixed[0].data.schedules).toHaveLength(11);expect(fixed[1].data.schedules.map(row=>row.dayOfWeek)).toEqual([1,2,4]);expect(fixed[2].data.schedules[0]).toMatchObject({dayOfWeek:6,startTime:'15:00',endTime:'17:00'});expect(fixed[3].data.schedules).toEqual([{dayOfWeek:3,startTime:'19:30',endTime:'21:00'},{dayOfWeek:0,startTime:'18:30',endTime:'20:30'}]);
 });
 it('propõe estudo, corrida e descanso sem sobrepor compromissos fixos',()=>{
  const plan=localSchedulePlan(text,'2026-10-17');const items=validateItems(plan.items);expect(items).toHaveLength(7);expect(items.find(i=>i.data.name==='Corrida').data.schedules).toHaveLength(3);expect(items.find(i=>i.kind==='metas').data.sessions).toHaveLength(3);expect(plan.assumptions.length).toBeGreaterThan(2);
 });
 it('aceita h30 e listas de dias, e não interpreta descrição sem horários',()=>{
  expect(readDays('às segundas-terças-quintas')).toEqual([1,2,4]);expect(extractFixedCommitments('Quero estudar mais')).toBe(null);expect(extractFixedCommitments('Trabalho segunda das 9h às 10h. Tenho atividade pessoal domingo das 19h30 às 21h.')[1].data.schedules[0].startTime).toBe('19:30');
 });
});
it('lê sessões existentes como data simples, ISO completo e Date sem quebrar o planejamento',()=>{
 const date='2026-10-22';
 for(const value of [date,date+'T00:00:00.000Z',new Date(date+'T00:00:00Z')]){
  const existing=[{kind:'metas',data:{title:'Meta já cadastrada',sessions:[{date:value,startTime:'18:00',endTime:'20:00'}]}}];
  const plan=localSchedulePlan('Quero encaixar mais tempo de estudo.','2026-10-21',existing);
  expect(plan.items.length).toBeGreaterThan(0);
  const sessions=plan.items.find(item=>item.kind==='metas').data.sessions;
  expect(sessions.filter(row=>row.date===date).every(row=>row.endTime<='18:00'||row.startTime>='20:00')).toBe(true);
  expect(()=>validateItems(plan.items)).not.toThrow();
 }
});
it('informa um cadastro inválido em vez de expor erro de push ou ignorar um conflito',()=>{
 expect(()=>localSchedulePlan('Quero encaixar mais tempo de estudo.','2026-10-21',[{kind:'metas',data:{sessions:[{date:'inválida',startTime:'18:00',endTime:'20:00'}]}}])).toThrow('Há um horário inválido');
});
