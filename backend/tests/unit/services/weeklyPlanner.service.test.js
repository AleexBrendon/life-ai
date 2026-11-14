import {it,expect} from 'vitest';
const {weekDates,planOptions,validateChanges,requestSchema}=require('../../../src/services/weeklyPlanner.service');
const date='2026-10-23',preferences=requestSchema.parse({date,includeGoalSessions:true});
const m=time=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
const row=(kind,id,startTime,endTime,extra={})=>({key:`${date}:${kind}:${id}`,kind,sourceId:id,date,title:`${kind} ${id}`,startTime,endTime,status:'PENDING',...extra});
const ctx={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[row('trabalho',1,'08:00','18:00'),row('rotinas',2,'18:15','19:00',{routineItemId:2,isFlexible:true,title:'Estudar'}),row('imprevistos',3,'18:20','19:00'),row('rotinas',4,'19:30','21:00',{isFlexible:false,title:'Culto'})]};
it('reduz sessão de meta e repõe os minutos na próxima semana',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'09:00',bufferMinutes:0,protectMeals:false});
 const context={dates:[date,'2026-10-24'],recoveryDates:['2026-10-25'],now:{date,minute:0},activities:[
  row('metas',17,'07:00','08:00',{goalId:7,until:'2026-10-30'}),row('imprevistos',1,'07:30','09:00'),
  row('trabalho',2,'07:00','09:00',{date:'2026-10-24',key:'work:saturday'}),
  row('trabalho',3,'07:30','09:00',{date:'2026-10-25',key:'work:sunday'})
 ]};
 const options=planOptions(context,preferences);expect(options.some(o=>o.applicable)).toBe(true);
 for(const option of options.filter(o=>o.applicable)){
  expect(option.changes[0].newEndTime).toBe('07:30');
  expect(option.additions[0]).toMatchObject({date:'2026-10-25',sourceId:7,newStartTime:'07:00',newEndTime:'07:30'});
  expect(()=>validateChanges(context,option,preferences)).not.toThrow();
  const tampered=structuredClone(option);tampered.additions=[];expect(()=>validateChanges(context,tampered,preferences)).toThrow();
  const wrongOwner=structuredClone(option);wrongOwner.additions[0].sourceId=99;expect(()=>validateChanges(context,wrongOwner,preferences)).toThrow();
 }
 const expired={...context,activities:context.activities.map(a=>a.kind==='metas'?{...a,until:date}:a)};
 expect(planOptions(expired,preferences).every(o=>!o.applicable)).toBe(true);
});
it('divide novas sessões entre mais dias sem reduzir o total semanal',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'09:00',bufferMinutes:0,protectMeals:false});
 const context={dates:[date,'2026-10-24'],now:{date,minute:0},activities:[row('trabalho',1,'07:30','09:00'),row('trabalho',2,'07:30','09:00',{date:'2026-10-24',key:'work:saturday'})],unscheduled:[{key:'metas:7',kind:'metas',sourceId:7,title:'Curso',minutes:60,missing:1,takenDates:[],until:null}]};
 for(const option of planOptions(context,preferences)){
  expect(option.additions).toHaveLength(2);
  expect(()=>validateChanges(context,option,preferences)).not.toThrow();
 }
});
it('encurta uma rotina flexível e repõe os minutos em outro dia somente nesta semana',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'09:00',bufferMinutes:0,protectMeals:false});
 const routine=row('rotinas',9,'07:00','09:00',{routineItemId:55,isFlexible:true,title:'Estudos'});
 const context={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[routine,row('trabalho',3,'07:30','08:00')],routineDates:[{routineItemId:55,date:'2026-10-22',scheduleId:10}]};
 const options=planOptions(context,preferences),option=options.find(candidate=>candidate.applicable&&candidate.additions.some(addition=>addition.oneOffRoutine));
 expect(option).toBeTruthy();
 const change=option.changes.find(item=>item.key===routine.key),extra=option.additions.find(item=>item.oneOffRoutine);
 expect(change.durationReducedMinutes).toBe(60);
 expect(m(change.newEndTime)-m(change.newStartTime)).toBe(60);
 expect(extra).toMatchObject({kind:'rotinas',routineItemId:55,oneOffRoutine:true});
 expect(extra.date).not.toBe('2026-10-22');
 expect(new Set([change.date,extra.date]).size).toBe(2);
 expect(m(change.newEndTime)-m(change.newStartTime)+m(extra.newEndTime)-m(extra.newStartTime)).toBe(120);
 expect(option.notes.some(note=>note.includes('mantive o total semanal planejado'))).toBe(true);
 expect(()=>validateChanges(context,option,preferences)).not.toThrow();
});
it('mantém a redução de duração quando não há outro dia livre para repor os minutos',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'09:00',bufferMinutes:0,protectMeals:false});
 const routine=row('rotinas',9,'07:00','09:00',{routineItemId:55,isFlexible:true,title:'Estudos'});
 const blocked=weekDates(date).filter(day=>day>='2026-10-21'&&day!==date).map((day,index)=>row('trabalho',20+index,'07:00','09:00',{date:day,key:`work:${day}`}));
 const context={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[routine,row('trabalho',3,'07:30','08:00'),...blocked]};
 const option=planOptions(context,preferences).find(candidate=>candidate.id==='minimal');
 expect(option.applicable).toBe(true);
 expect(option.changes.some(change=>change.durationReducedMinutes>0)).toBe(true);
 expect(option.additions.some(addition=>addition.oneOffRoutine)).toBe(false);
 expect(option.notes.some(note=>note.includes('não havia espaço para repor'))).toBe(true);
 expect(()=>validateChanges(context,option,preferences)).not.toThrow();
});
it('reagenda uma rotina não flexível apenas como ocorrência pontual quando um imprevisto bloqueia o dia',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'23:00',bufferMinutes:0,protectMeals:false});
 const routine=row('rotinas',15,'18:00','19:00',{routineItemId:55,isFlexible:false,title:'Consulta de estudos'});
 const context={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[routine,row('imprevistos',80,'07:00','23:00',{title:'Imprevisto'})],routineDates:[{routineItemId:55,date,scheduleId:15}]};
 const options=planOptions(context,preferences),option=options.find(item=>item.applicable&&item.changes.some(change=>change.rescheduledForRecovery));
 expect(option).toBeTruthy();
 const change=option.changes.find(item=>item.rescheduledForRecovery);
 expect(change).toMatchObject({kind:'rotinas',date,newDate:'2026-10-24',rescheduledForRecovery:true});
 expect(m(change.newEndTime)-m(change.newStartTime)).toBe(60);
 expect(()=>validateChanges(context,option,preferences)).not.toThrow();
});
it('reagenda lembrete semanal para outro dia sem alterar sua recorrência',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'23:00',bufferMinutes:0,protectMeals:false});
 const reminder=row('lembretes',27,'18:00','18:05',{recurrence:'WEEKLY',title:'Enviar documento'});
 const context={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[reminder,row('imprevistos',80,'07:00','23:00',{title:'Imprevisto'})],reminderDates:[{reminderId:27,date}]};
 const option=planOptions(context,preferences).find(item=>item.applicable&&item.changes.some(change=>change.rescheduledForRecovery));
 expect(option).toBeTruthy();
 const change=option.changes.find(item=>item.rescheduledForRecovery);
 expect(change).toMatchObject({kind:'lembretes',date,newDate:'2026-10-24',rescheduledForRecovery:true,newStartTime:'18:00',newEndTime:'18:05'});
 expect(()=>validateChanges(context,option,preferences)).not.toThrow();
});
it('ajusta o horário da refeição para liberar a prioridade informada sem reduzir a duração',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'23:00',bufferMinutes:0,protectMeals:true,message:'Priorizar almoço'});
 const meal=row('refeicoes','LUNCH','12:00','13:00',{mealType:'LUNCH',isMeal:true,title:'Almoço'});
 const context={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[meal,row('imprevistos',80,'12:00','13:00',{title:'Imprevisto'})],meals:[{mealType:'LUNCH',title:'Almoço',startTime:'12:00',endTime:'13:00'}]};
 const option=planOptions(context,preferences).find(item=>item.applicable&&item.changes.some(change=>change.mealAdjustment));
 expect(option).toBeTruthy();
 const change=option.changes.find(item=>item.mealAdjustment);
 expect(change.newStartTime).not.toBe('12:00');
 expect(m(change.newEndTime)-m(change.newStartTime)).toBe(60);
 expect(context.meals[0]).toMatchObject({startTime:'12:00',endTime:'13:00'});
 expect(()=>validateChanges(context,option,preferences)).not.toThrow();
});
it('prioriza as atividades mencionadas no pedido antes de reorganizar outras',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'11:00',bufferMinutes:0,protectMeals:false,message:'Priorizar flauta'});
 const reading=row('rotinas',31,'09:00','10:00',{routineItemId:31,isFlexible:true,title:'Leitura',category:'Estudos'});
 const flute=row('rotinas',32,'09:00','10:00',{routineItemId:32,isFlexible:true,title:'Tocar flauta',category:'Música'});
 const context={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[reading,flute]};
 const option=planOptions(context,preferences).find(item=>item.applicable);
 expect(option).toBeTruthy();
 expect(option.changes.some(change=>change.key===reading.key)).toBe(true);
 expect(option.changes.some(change=>change.key===flute.key)).toBe(false);
});
it('move a refeição para preservar a atividade indicada como prioridade',()=>{
 const preferences=requestSchema.parse({date,startTime:'07:00',endTime:'23:00',bufferMinutes:0,protectMeals:true,message:'Priorizar estudo'});
 const study=row('rotinas',35,'10:00','11:00',{routineItemId:35,isFlexible:true,title:'Estudo de matemática',category:'Estudos'});
 const lunch=row('refeicoes','LUNCH','10:00','11:00',{mealType:'LUNCH',isMeal:true,title:'Almoço'});
 const context={dates:weekDates(date),now:{date:'2026-10-21',minute:600},activities:[study,lunch],meals:[{mealType:'LUNCH',title:'Almoço',startTime:'10:00',endTime:'11:00'}]};
 const option=planOptions(context,preferences).find(item=>item.id==='minimal');
 expect(option.applicable).toBe(true);
 expect(option.changes).toContainEqual(expect.objectContaining({key:lunch.key,mealAdjustment:true}));
 expect(option.changes.some(change=>change.key===study.key)).toBe(false);
 expect(()=>validateChanges(context,option,preferences)).not.toThrow();
});
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
