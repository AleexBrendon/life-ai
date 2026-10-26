import {beforeAll,afterAll,it,expect,vi} from 'vitest';
const prisma=require('../../../src/database/prisma'),redis=require('../../../src/database/redis'),app=require('../../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
const users=[],tokens=[];let date,event,routine,schedule,weekProposal,shoppingProposal;
const api=(method,path,body,owner=0)=>request(app)[method]('/api/ai'+path).set('Authorization',`Bearer ${tokens[owner]}`).send(body);
const providerKey=process.env.OPENROUTER_API_KEY;
beforeAll(async()=>{
 process.env.OPENROUTER_API_KEY='test-no-network';
 vi.stubGlobal('fetch',vi.fn(async url=>{
  if(String(url).startsWith('https://openrouter.ai/'))return new Response(JSON.stringify({model:'mock-free',choices:[{message:{content:'Revise as alternativas calculadas antes de confirmar.'}}]}),{headers:{'Content-Type':'application/json'}});
  if(String(url).startsWith('https://www.bing.com/'))return new Response('<rss><channel><item><link>https://www.pichau.com.br/monitor-teste</link></item></channel></rss>');
  if(String(url)==='https://www.pichau.com.br/monitor-teste')return new Response('<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Monitor teste',offers:{price:1200,priceCurrency:'BRL',availability:'https://schema.org/InStock'},aggregateRating:{ratingValue:4.9,reviewCount:540}})+'</script>');
  throw Error('No external calls in tests');
 }));
 for(let i=0;i<2;i++){const u=await prisma.user.create({data:{name:'MVP IA teste',email:`ai-mvp-${Date.now()}-${i}@example.invalid`,passwordHash:'not-used',profile:{create:{timezone:'America/Sao_Paulo'}}}});users.push(u.id);tokens.push(jwt.sign({sub:String(u.id)},process.env.JWT_SECRET,{expiresIn:'10m'}))}
 const day=new Date();day.setUTCDate(day.getUTCDate()+7);date=day.toISOString().slice(0,10);const weekday=new Date(date+'T12:00:00Z').getUTCDay();
 routine=await prisma.routineItem.create({data:{userId:users[0],name:'Corrida flexível',type:'Saúde',isFlexible:true,schedules:{create:{dayOfWeek:weekday,startTime:'18:15',endTime:'19:00'}}},include:{schedules:true}});schedule=routine.schedules[0];
 await prisma.routineItem.create({data:{userId:users[0],name:'Culto fixo',type:'Pessoal',schedules:{create:{dayOfWeek:weekday,startTime:'19:30',endTime:'21:00'}}}});
 await prisma.job.create({data:{userId:users[0],name:'Trabalho fixo',schedules:{create:{dayOfWeek:weekday,startTime:'08:00',endTime:'18:00',breakStart:'12:00',breakEnd:'14:00'}}}});
 event=await prisma.unexpectedEvent.create({data:{userId:users[0],title:'Imprevisto',date:new Date(date+'T00:00:00Z'),startTime:'18:20',endTime:'19:00',priority:'HIGH',status:'PENDING'}});
 await prisma.financeEntry.createMany({data:[{userId:users[0],kind:'INCOME',title:'Salário',amountCents:500000},{userId:users[0],kind:'EXPENSE',title:'Contas fixas',amountCents:300000}]});
});
afterAll(async()=>{vi.unstubAllGlobals();if(providerKey===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=providerKey;if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
it('reavalia pelo chat e pelo cadastro, identificando itens novos sem duplicar registros',async()=>{
 const first=await api('post','/chat',{date,message:'Avalie minha rotina com os itens atuais'});
 expect(first.status).toBe(200);expect(first.body.data.monthlyProposal.action).toBe('PLAN_MONTH_ROUTINE');
 const added=await prisma.routineItem.create({data:{userId:users[0],name:'Novo treino de flauta',type:'Música'}});
 const next=await api('post','/chat',{date,message:'Refaça minha rotina considerando os novos itens'});
 expect(next.status).toBe(200);
 // The new routine has no schedule yet, so the remounted routine proposes slots for it.
 expect(next.body.data.monthlyProposal.changes.options.some(option=>option.changes.some(change=>change.title===added.name&&!change.old))).toBe(true);
 const setup=await api('post','/setup/preview',{message:'Reavalie minha rotina cadastrada',draft:[]});
 expect(setup.status).toBe(200);expect(setup.body.data.monthlyProposal.action).toBe('PLAN_MONTH_ROUTINE');
 expect(await prisma.routineItem.count({where:{userId:users[0],name:added.name}})).toBe(1);
 await prisma.routineItem.delete({where:{id:added.id}});
});
it('gera alternativas semanais sem modificar nada e respeita propriedade do imprevisto',async()=>{
 expect((await request(app).post('/api/ai/week/preview').send({date})).status).toBe(401);
 expect((await api('post','/week/preview',{date,unexpectedEventId:event.id},1)).status).toBe(404);
 const response=await api('post','/week/preview',{date,unexpectedEventId:event.id});expect(response.status).toBe(200);weekProposal=response.body.data;
 expect(weekProposal.action).toBe('REORGANIZE_WEEK');expect(new Date(weekProposal.changes.weekStart+'T12:00:00Z').getUTCDay()).toBe(0);expect(weekProposal.changes.options.some(o=>o.applicable)).toBe(true);
 expect(await prisma.routineExecution.count({where:{userId:users[0]}})).toBe(0);
});
it('aplica um lote somente uma vez, sem mudar horários recorrentes nem compromissos fixos',async()=>{
 const option=weekProposal.changes.options.find(o=>o.applicable),path=`/week/${weekProposal.id}/apply`;
 expect((await api('post',path,{optionId:option.id},1)).status).toBe(409);
 const response=await api('post',path,{optionId:option.id});expect(response.status).toBe(200);expect(response.body.data.changes).toHaveLength(option.changes.length);
 expect((await api('post',path,{optionId:option.id})).status).toBe(409);
 expect((await prisma.routineSchedule.findUnique({where:{id:schedule.id}})).startTime).toBe('18:15');
 expect((await prisma.unexpectedEvent.findUnique({where:{id:event.id}})).startTime).toBe('18:20');
 const execution=await prisma.routineExecution.findFirst({where:{userId:users[0],routineScheduleId:schedule.id}});expect(execution.endTime<='23:00').toBe(true);expect(execution.startTime).not.toBe('18:15');
});
it('uma mudança na agenda invalida a proposta sem aplicar parcialmente',async()=>{
 const response=await api('post','/week/preview',{date});expect(response.status).toBe(200);const proposal=response.body.data,option=proposal.changes.options.find(o=>o.applicable);expect(option).toBeTruthy();
 await prisma.unexpectedEvent.update({where:{id:event.id},data:{endTime:'19:10'}});
 const before=await prisma.routineExecution.findMany({where:{userId:users[0]}});
 expect((await api('post',`/week/${proposal.id}/apply`,{optionId:option.id})).status).toBe(409);
 expect(await prisma.routineExecution.findMany({where:{userId:users[0]}})).toEqual(before);
});
it('um cadastro novo sem horário também exige reavaliação antes de aplicar',async()=>{
 const response=await api('post','/week/preview',{date});
 const proposal=response.body.data,option=proposal.changes.options.find(o=>o.applicable);expect(option).toBeTruthy();
 const newItem=await prisma.routineItem.create({data:{userId:users[0],name:'Rotina nova sem horário',type:'Pessoal'}});
 const result=await api('post',`/week/${proposal.id}/apply`,{optionId:option.id});
 expect(result.status).toBe(409);expect(result.body.message).toContain('cadastros mudaram');
 await prisma.routineItem.delete({where:{id:newItem.id}});
});
it('o chat encaminha reorganização e compras para os fluxos corretos',async()=>{
 const weekly=await api('post','/chat',{message:'Reorganize minha semana',date});expect(weekly.status).toBe(200);expect(weekly.body.data.weeklyProposal.action).toBe('REORGANIZE_WEEK');
 expect((await api('post','/chat',{message:'Quero comprar um monitor'})).body.data.mode).toBe('shopping');
});
it('pesquisa fontes verificáveis e calcula orçamento sem salvar compra automaticamente',async()=>{
 const response=await api('post','/shopping/analyze',{query:'Monitor IPS',interestRatePercent:0});expect(response.status).toBe(200);shoppingProposal=response.body.data;
 expect(shoppingProposal.changes.sources.offers[0]).toMatchObject({priceCents:120000,rating:4.9,reviewCount:540,salesCount:null,officialSellerConfirmed:false});
 expect(shoppingProposal.changes.strategies.some(s=>s.id==='installments')).toBe(true);
 expect(await prisma.financeEntry.count({where:{userId:users[0],kind:'PURCHASE'}})).toBe(0);
 expect((await api('post','/shopping/analyze',{query:'Monitor',urls:['https://localhost/private']})).status).toBe(400);
});
it('salva a estratégia só com confirmação, protege outras contas e não duplica',async()=>{
 const path=`/shopping/${shoppingProposal.id}/apply`;
 expect((await api('post',path,{strategyId:'installments'},1)).status).toBe(404);
 expect((await api('post',path,{strategyId:'installments'})).status).toBe(200);
 expect((await api('post',path,{strategyId:'installments'})).status).toBe(404);
 expect(await prisma.financeEntry.count({where:{userId:users[0],kind:'PURCHASE'}})).toBe(1);
});
it('revalida o orçamento antes de salvar e não depende de inventar dados quando lojas bloqueiam',async()=>{
 const preview=await api('post','/shopping/analyze',{query:'Monitor IPS',priceCents:120000,interestRatePercent:0});expect(preview.status).toBe(200);
 await prisma.financeEntry.create({data:{userId:users[0],kind:'EXPENSE',title:'Nova despesa',amountCents:600000}});
 expect((await api('post',`/shopping/${preview.body.data.id}/apply`,{strategyId:'installments'})).status).toBe(409);
 expect(await prisma.financeEntry.count({where:{userId:users[0],kind:'PURCHASE'}})).toBe(1);
 const before=process.env.OPENROUTER_API_KEY;delete process.env.OPENROUTER_API_KEY;
 const offline=await api('post','/shopping/analyze',{query:'Outro produto',urls:['https://www.pichau.com.br/bloqueado']});process.env.OPENROUTER_API_KEY=before;
 expect(offline.status).toBe(200);expect(offline.body.data.changes.sources.offers).toEqual([]);expect(offline.body.data.changes.priceCents).toBeNull();expect(offline.body.data.changes.strategies).toEqual([]);
});
it('reavalia os cadastros atuais a cada nova sugestão',async()=>{
 const before=await api('post','/week/preview',{date});expect(before.status).toBe(200);
 const count=before.body.data.changes.assessment.counts.routines;
 const added=await prisma.routineItem.create({data:{userId:users[0],name:'Nova rotina sem horário',type:'Música'}});
 const after=await api('post','/week/preview',{date});expect(after.status).toBe(200);
 expect(after.body.data.changes.assessment.counts.routines).toBe(count+1);
 expect(after.body.data.changes.assessment.findings.some(row=>row.message.includes('Nova rotina sem horário'))).toBe(true);
 await prisma.routineItem.update({where:{id:added.id},data:{isActive:false}});
 const updated=await api('post','/week/preview',{date});expect(updated.status).toBe(200);
 expect(updated.body.data.changes.assessment.findings.some(row=>row.message.includes('Nova rotina sem horário'))).toBe(false);
});
it('sugere horários para rotinas e metas definidas pela IA e só salva após aprovação',async()=>{
 const routine=await prisma.routineItem.create({data:{userId:users[1],name:'Leitura pela IA',type:'Estudos',autoSchedule:true,weeklyFrequency:2,sessionMinutes:30}});
 const goal=await prisma.goal.create({data:{userId:users[1],title:'Curso pela IA',autoSchedule:true,weeklyFrequency:3,sessionMinutes:45}});
 const response=await api('post','/week/preview',{date},1);expect(response.status).toBe(200);
 const proposal=response.body.data,option=proposal.changes.options.find(o=>o.applicable&&o.additions.length);expect(option).toBeTruthy();
 expect(proposal.changes.assessment.findings.some(row=>row.message.includes('aguardando horário definido pela IA'))).toBe(true);
 expect(await prisma.routineSchedule.count({where:{routineItemId:routine.id}})).toBe(0);expect(await prisma.goalPlanSession.count({where:{goalId:goal.id}})).toBe(0);
 expect((await api('post',`/week/${proposal.id}/apply`,{optionId:option.id},1)).status).toBe(200);
 const schedules=await prisma.routineSchedule.findMany({where:{routineItemId:routine.id}}),sessions=await prisma.goalPlanSession.findMany({where:{goalId:goal.id}});
 expect(schedules).toHaveLength(2);expect(new Set(schedules.map(s=>s.dayOfWeek)).size).toBe(2);expect(sessions).toHaveLength(3);
 const next=await api('post','/week/preview',{date},1);expect(next.status).toBe(200);expect(next.body.data.changes.options.every(o=>!o.additions.length)).toBe(true);
});
it('analisa finanças pelo chat consultando dados novos sem depender de resposta genérica',async()=>{
 await prisma.financeEntry.create({data:{userId:users[1],kind:'INCOME',title:'Salário do teste',amountCents:500000}});
 const first=await api('post','/chat',{message:'Analise minhas finanças'},1);
 expect(first.status).toBe(200);expect(first.body.data.financeAssessment.months[0].incomeCents).toBe(500000);
 await prisma.financeEntry.create({data:{userId:users[1],kind:'EXPENSE',title:'Despesa nova do teste',amountCents:50000}});
 const fresh=await api('post','/chat',{message:'Reavalie minhas finanças'},1);
 expect(fresh.body.data.financeAssessment.months[0].capacityCents).toBe(400000);
 expect(fresh.body.data.financeAssessment.months[0].sources.some(row=>row.title==='Despesa nova do teste')).toBe(true);
 expect(fresh.body.data.message).not.toBe(first.body.data.message);
});
