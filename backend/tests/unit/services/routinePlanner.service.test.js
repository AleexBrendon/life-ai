import {it,expect} from 'vitest';
const {requestSchema,category,cycleEnd,evaluate,buildOptions,recommend,feedbackFrom,checkinSteps,validateTemplate}=require('../../../src/services/routinePlanner.service');
const prefs=requestSchema.parse({});
const m=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
const work=(day,start,end)=>({key:`ws:${day}:0`,kind:'trabalho',sourceId:1,title:'Trabalho CLT',category:'work',day,start:m(start),end:m(end)});
function routine(id,title,cat,slots,frequency=slots.length){const origStarts=Object.fromEntries(slots.map(([day,start])=>[day,m(start)]));return slots.map(([day,start,end],i)=>({key:`rs:${id}${i}`,kind:'rotinas',sourceId:id,sourceKey:`rotinas:${id}`,scheduleId:id*10+i,title,category:cat,day,start:m(start),end:m(end),duration:m(end)-m(start),frequency,orig:{day,start:m(start)},origStarts}))}
const fb=feedbackFrom(null,[]);
const ctx={fixed:[1,2,3,4,5].map(day=>work(day,'08:00','18:00')),sessions:[...routine(7,'Corrida','exercise',[[5,'19:00','21:00'],[6,'18:00','20:00']]),...routine(8,'Pausa e descanso','rest',[[6,'18:00','18:30'],[1,'18:15','18:45']]),...routine(9,'Culto','spiritual',[[0,'18:30','20:30']])],demands:[{key:'g:4:0',kind:'metas',sourceId:4,sourceKey:'metas:4',title:'Estudar faculdade',category:'study',duration:45,frequency:2},{key:'g:4:1',kind:'metas',sourceId:4,sourceKey:'metas:4',title:'Estudar faculdade',category:'study',duration:45,frequency:2}]};
it('classifica atividades e define ciclos mensais',()=>{
 expect(category('Treino Flauta','Organização')).toBe('skill');expect(category('Corrida','Atividade física')).toBe('exercise');expect(category('Culto','Pessoal')).toBe('spiritual');expect(category('Estudar faculdade EAD')).toBe('study');
 expect(cycleEnd('2026-10-05')).toBe('2026-10-31');expect(cycleEnd('2026-10-25')).toBe('2026-11-30');expect(cycleEnd('2026-12-28')).toBe('2027-01-31');
});
it('aponta conflitos, refeição ocupada e treinos em dias seguidos na rotina atual',()=>{
 const state=[...ctx.fixed.map(r=>({...r,flexible:false})),...ctx.sessions.map(r=>({...r,flexible:true}))],result=evaluate(state,prefs);
 expect(result.conflicts).toBeGreaterThan(0);expect(result.consecutive).toBeGreaterThan(0);
 expect(result.issues.some(text=>text.includes('coincide com'))).toBe(true);expect(result.issues.some(text=>text.includes('Culto ocupa'))).toBe(false);
});
it('gera alternativas válidas que melhoram a pontuação sem mover trabalho, culto ou descanso de dia',()=>{
 const {before,options}=buildOptions(ctx,prefs,fb);expect(options[0].id).toBe('keep');expect(options.length).toBeGreaterThan(1);
 for(const option of options){
  expect(()=>validateTemplate(ctx,option,prefs)).not.toThrow();
  expect(option.template.routines).toHaveLength(ctx.sessions.length);expect(option.template.goals).toHaveLength(2);
  for(const row of option.template.routines.filter(row=>/Culto|Pausa/.test(row.title)))expect(ctx.sessions.find(s=>s.key===row.key).orig.day).toBe(row.dayOfWeek);
  for(const row of [...option.template.routines,...option.template.goals])expect(row.endTime<=prefs.flexEnd).toBe(true);
 }
 const best=options.find(o=>o.id==='health');expect(best.metrics.score).toBeGreaterThan(before.score);expect(best.metrics.conflicts).toBe(0);
 expect(new Set(best.template.goals.map(g=>g.dayOfWeek)).size).toBe(2);
});
it('recusa propostas adulteradas',()=>{
 const option=structuredClone(buildOptions(ctx,prefs,fb).options.find(o=>o.id==='health'));
 const overlap=structuredClone(option);overlap.template.goals[0]={...overlap.template.goals[0],dayOfWeek:1,startTime:'09:00',endTime:'09:45'};expect(()=>validateTemplate(ctx,overlap,prefs)).toThrow();
 const longer=structuredClone(option);longer.template.goals[0].endTime='23:30';expect(()=>validateTemplate(ctx,longer,prefs)).toThrow();
 const missing=structuredClone(option);missing.template.routines.pop();expect(()=>validateTemplate(ctx,missing,prefs)).toThrow();
});
it('usa o desempenho e as respostas para mudar horários com baixa adesão ou manter a rotina',()=>{
 const performance={rate:0.4,items:[{key:'rotinas:7',total:8,completed:1,rate:0.13}]};
 const low=feedbackFrom(performance,[{answers:[{id:'energy',type:'scale',value:2},{id:'hardest',text:'Mais difícil?',type:'text',value:'Corrida à noite'}]}]);
 expect(low.low.get('rotinas:7')).toBe(0.13);expect(low.tired).toBe(true);expect(low.notes[0]).toContain('Corrida à noite');
 const minimal=buildOptions(ctx,prefs,low).options.find(o=>o.id==='minimal');expect(minimal.changes.some(c=>c.title==='Corrida'&&c.reasons.some(r=>r.includes('adesão')))).toBe(true);
 const calm={fixed:ctx.fixed,sessions:routine(7,'Corrida','exercise',[[2,'06:00','07:00'],[6,'09:00','10:00']]),demands:[]};
 const good=feedbackFrom({rate:0.9,items:[{key:'rotinas:7',total:8,completed:8,rate:1}]},[{answers:[{id:'keep',type:'scale',value:5},{id:'satisfaction',type:'scale',value:5}]}]);
 expect(good.positive).toBe(true);expect(recommend(buildOptions(calm,prefs,good).options,good,'')).toBe('keep');
});
it('abre a avaliação diária nos três últimos dias do ciclo',()=>{
 const cycle={endDate:new Date('2026-10-31T00:00:00Z'),checkins:[{step:1,answers:[]}]};
 expect(checkinSteps(cycle,'2026-10-28').every(s=>!s.available)).toBe(true);
 const steps=checkinSteps(cycle,'2026-10-30');expect(steps.map(s=>s.date)).toEqual(['2026-10-29','2026-10-30','2026-10-31']);
 expect(steps.map(s=>[s.available,s.answered])).toEqual([[true,true],[true,false],[false,false]]);expect(steps.every(s=>s.questions.length===5)).toBe(true);
});
it('protege preparo e deslocamento na semana-modelo mensal',()=>{
 const current={fixed:ctx.fixed.map(row=>({...row,beforeMinutes:75,afterMinutes:15})),sessions:[],demands:ctx.demands};
 const {options}=buildOptions(current,prefs,fb);
 for(const option of options){expect(()=>validateTemplate(current,option,prefs)).not.toThrow();for(const row of option.template.goals.filter(row=>row.dayOfWeek>=1&&row.dayOfWeek<=5))expect(m(row.startTime)>=18*60+30||m(row.endTime)<=6*60+30).toBe(true)}
});
