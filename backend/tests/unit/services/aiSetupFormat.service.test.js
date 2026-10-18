import {describe,it,expect} from 'vitest';
const {parseSetupResponse,validateItems}=require('../../../src/services/aiSetup.service');
const output={message:'Ainda preciso de informações.',questions:['Qual o horário das aulas?'],assumptions:[],items:[]};
describe('Leitura de propostas da IA',()=>{
 it('aceita JSON simples, com explicação ao redor e com cerca de código',()=>{
  const json=JSON.stringify(output);
  expect(parseSetupResponse(json)).toEqual(output);
  expect(parseSetupResponse('Segue a proposta:\n```json\n'+json+'\n```\nConfira antes de salvar.')).toEqual(output);
 });
 it('preserva chaves e aspas escapadas dentro dos textos',()=>{
  const data={...output,message:'Anotação {exemplo} com "aspas" e caminho \\teste'};
  expect(parseSetupResponse('Resposta: '+JSON.stringify(data)+' Fim.')).toEqual(data);
 });
 it('rejeita JSON incompleto ou resposta sem o contrato esperado',()=>{
  expect(()=>parseSetupResponse('{"message":"truncado"')).toThrow();
  expect(()=>parseSetupResponse('{"rotina":"fora do contrato"}')).toThrow();
 });
});


describe('Normalização e revisão de horários',()=>{
 it('expande dias agrupados e reconhece um registro plano sem inventar horários',()=>{
  const output=parseSetupResponse(JSON.stringify({items:[{name:'Trabalho Exemplo',company:'Exemplo',position:null,schedules:[{days:['segunda','terça','quinta'],startTime:'09:00',endTime:'18:00',breakStart:'12:00',breakEnd:'13:00'}],tasks:[]}]}));
  const items=validateItems(output.items);expect(items[0].kind).toBe('trabalho');expect(items[0].data.schedules.map(row=>row.dayOfWeek)).toEqual([1,2,4]);
 });
 it('impede sugestão de estudo durante o trabalho e permite a pausa informada',()=>{
  const work={kind:'trabalho',data:{name:'Trabalho',schedules:[{dayOfWeek:1,startTime:'09:00',endTime:'18:00',breakStart:'12:00',breakEnd:'13:00'}],tasks:[]}};
  const goal={kind:'metas',data:{title:'Estudo',weeklyFrequency:1,sessionMinutes:30,sessions:[{date:'2026-10-19',startTime:'10:00',endTime:'10:30'}]}};
  expect(()=>validateItems([work,goal])).toThrow('sobrepostos');
  goal.data.sessions[0].startTime='12:00';goal.data.sessions[0].endTime='12:30';expect(validateItems([work,goal])).toHaveLength(2);
 });
});
