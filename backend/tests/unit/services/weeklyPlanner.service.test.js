import {it,expect} from 'vitest';
const {weekDates,planOptions,validateChanges,requestSchema}=require('../../../src/services/weeklyPlanner.service');
const date='2026-10-23',preferences=requestSchema.parse({date,includeGoalSessions:true});
const row=(kind,id,startTime,endTime,extra={})=>({key:`${date}:${kind}:${id}`,kind,sourceId:id,date,title:`${kind} ${id}`,startTime,endTime,status:'PENDING',...extra});
const ctx={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[row('trabalho',1,'08:00','18:00'),row('rotinas',2,'18:15','19:00',{routineItemId:2,isFlexible:true,title:'Estudar'}),row('imprevistos',3,'18:20','19:00'),row('rotinas',4,'19:30','21:00',{isFlexible:false,title:'Culto'})]};
it('sempre considera domingo a sábado, inclusive virada de ano',()=>{expect(weekDates('2027-01-01')).toEqual(['2026-12-27','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02'])});
it('reserva preparo, ida e volta ao redor de trabalho e culto',()=>{
 const current={...ctx,activities:[row('trabalho',1,'08:00','18:00',{beforeMinutes:75,afterMinutes:15}),row('rotinas',4,'19:30','21:00',{isFlexible:false,title:'Culto',beforeMinutes:75,afterMinutes:15}),row('rotinas',2,'18:15','18:45',{routineItemId:2,isFlexible:true,title:'Estudar'})]};
 const options=planOptions(current,preferences).filter(o=>o.applicable);
 expect(options.length).toBeGreaterThan(0);
 for(const option of options){expect(option.changes.every(c=>c.newStartTime>='21:30')).toBe(true);expect(()=>validateChanges(current,option,preferences)).not.toThrow()}
});
it('identifica compromissos fixos que conflitam apenas por causa do deslocamento',()=>{
 const current={...ctx,activities:[row('trabalho',1,'08:00','18:00',{beforeMinutes:75,afterMinutes:15}),row('rotinas',4,'19:00','21:00',{isFlexible:false,title:'Culto',beforeMinutes:75,afterMinutes:15})]};
 expect(planOptions(current,preferences).every(o=>!o.applicable&&o.unresolved.length)).toBe(true);
});
it('resolve imprevisto movendo somente rotinas flexíveis sem alterar duração nem passar de 23h',()=>{
 const options=planOptions(ctx,preferences);expect(options.length).toBeGreaterThan(0);expect(options.length).toBeLessThanOrEqual(3);
 for(const option of options.filter(o=>o.applicable)){expect(option.changes.every(c=>c.sourceId===2)).toBe(true);expect(option.changes.every(c=>c.newEndTime<='23:00')).toBe(true);expect(()=>validateChanges(ctx,option,preferences)).not.toThrow();}
 expect(options.some(o=>o.applicable)).toBe(true);
});
it('não move atividades concluídas, passadas ou fixas',()=>{
 const current={...ctx,activities:ctx.activities.map(a=>({...a,status:'COMPLETED'}))};expect(planOptions(current,preferences).every(o=>o.changes.length===0)).toBe(true);
});
it('conflito entre dois compromissos fixos impede aplicar a opção',()=>{const context={...ctx,activities:[...ctx.activities,row('imprevistos',99,'09:00','10:00')]};expect(planOptions(context,preferences).every(o=>!o.applicable&&o.unresolved.length>0)).toBe(true)});
it('recusa horários adulterados ou que criam sobreposição',()=>{
 const option=planOptions(ctx,preferences).find(o=>o.applicable);const changed=structuredClone(option);changed.changes[0].newStartTime='09:00';changed.changes[0].newEndTime='09:45';expect(()=>validateChanges(ctx,changed,preferences)).toThrow();
 const late=structuredClone(option);late.changes[0].newEndTime='23:45';expect(()=>validateChanges(ctx,late,preferences)).toThrow();
});
it('sugere horários livres para itens que a IA deve agendar, em dias diferentes e sem conflito',()=>{
 const context={...ctx,unscheduled:[{key:'rotinas:7',kind:'rotinas',sourceId:7,title:'Ler',minutes:45,missing:2,takenDates:[],until:null},{key:'metas:8',kind:'metas',sourceId:8,title:'Curso de inglês',minutes:60,missing:3,takenDates:['2026-10-22'],until:'2026-10-24'}]};
 const options=planOptions(context,preferences);expect(options.length).toBeGreaterThan(0);
 for(const option of options){
  const routine=option.additions.filter(a=>a.itemKey==='rotinas:7'),goal=option.additions.filter(a=>a.itemKey==='metas:8');
  expect(routine).toHaveLength(2);expect(new Set(routine.map(a=>a.date)).size).toBe(2);
  expect(goal.every(a=>a.date>='2026-10-21'&&a.date<='2026-10-24'&&a.date!=='2026-10-22')).toBe(true);
  expect(option.additions.every(a=>a.newEndTime<='23:00')).toBe(true);
  if(option.applicable)expect(()=>validateChanges(context,option,preferences)).not.toThrow();
 }
 expect(options.some(o=>o.applicable&&o.additions.length)).toBe(true);
});
it('recusa sugestões de novos horários adulteradas',()=>{
 const context={...ctx,unscheduled:[{key:'rotinas:7',kind:'rotinas',sourceId:7,title:'Ler',minutes:45,missing:1,takenDates:[],until:null}]};
 const option=planOptions(context,preferences).find(o=>o.applicable&&o.additions.length);
 const overlap=structuredClone(option),addition=overlap.additions.find(a=>a.date===date)||overlap.additions[0];addition.date=date;addition.key=`${date}:rotinas:novo:7`;addition.newStartTime='09:00';addition.newEndTime='09:45';expect(()=>validateChanges(context,overlap,preferences)).toThrow();
 const extra=structuredClone(option);extra.additions.push({...extra.additions[0],date:'2026-10-24',key:'2026-10-24:rotinas:novo:7'});expect(()=>validateChanges(context,extra,preferences)).toThrow();
 const other=structuredClone(option);other.additions[0].sourceId=99;expect(()=>validateChanges(context,other,preferences)).toThrow();
});
