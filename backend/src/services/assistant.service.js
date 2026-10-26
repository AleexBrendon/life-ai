const prisma=require('../database/prisma');
const {interpret,intentOf,normalize}=require('./routineIntent.service');
const planner=require('./routinePlanner.service');
const days=['dom','seg','ter','qua','qui','sex','sáb'];
const minute=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
const addDays=(key,n)=>{const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const CATEGORY_LABEL={work:'Trabalho'};

async function existingRecords(userId){
 const [routines,jobs,goals]=await Promise.all([
  prisma.routineItem.findMany({where:{userId},select:{id:true,name:true,type:true,weeklyFrequency:true,sessionMinutes:true,isFlexible:true,autoSchedule:true}}),
  prisma.job.findMany({where:{userId},select:{id:true,name:true}}),
  prisma.goal.findMany({where:{userId,status:{not:'COMPLETED'}},select:{id:true,title:true,weeklyFrequency:true,sessionMinutes:true}}),
 ]);
 return [...routines.map(r=>({...r,kind:'rotinas',category:r.type})),...jobs.map(j=>({...j,kind:'trabalho',category:'Trabalho'})),...goals.map(g=>({...g,name:g.title,kind:'metas',category:'Estudos'}))];
}
const slotText=row=>`${days[row.dayOfWeek]} ${row.startTime}–${row.endTime}`;
// Goal sessions are dated: each weekly slot becomes the next matching date (today only if still ahead).
function sessionDates(placements,now){
 return placements.map(row=>{let date=now.date;for(let n=0;n<7;n++){const candidate=addDays(now.date,n);if(new Date(candidate+'T12:00:00Z').getUTCDay()===row.dayOfWeek){date=candidate;break}}if(date===now.date&&minute(row.startTime)<=now.minute)date=addDays(date,7);return {date,startTime:row.startTime,endTime:row.endTime,status:'PENDING'}}).sort((a,b)=>a.date.localeCompare(b.date));
}
function itemsFrom(plan,existing){
 const items=[],assumptions=[],questions=[];
 for(const activity of plan.activities){
  const record=existing.find(row=>row.kind===activity.kind&&row.id===activity.existingId);
  const label=record?`${activity.name} (já cadastrada)`:activity.name;
  if(activity.kind==='trabalho'){
   if(!activity.slots.length){questions.push(`Quais dias e horários de ${activity.name}? Ex.: segunda a sexta das 8h às 18h.`);continue}
   const schedules=activity.slots.flatMap(slot=>slot.days.map(dayOfWeek=>({dayOfWeek,startTime:slot.startTime,endTime:slot.endTime,...(slot.breakStart?{breakStart:slot.breakStart,breakEnd:slot.breakEnd}:{})})));
   items.push(record?{op:'update',id:record.id,kind:'trabalho',data:{name:record.name,schedules}}:{kind:'trabalho',data:{name:activity.name,isActive:true,schedules,tasks:[]}});
   assumptions.push(`${label}: ${schedules.map(row=>slotText(row)+(row.breakStart?` (pausa ${row.breakStart}–${row.breakEnd})`:'')).join(', ')}. Horário fixo, informado por você.`);
   continue;
  }
  const rows=activity.placements,fixed=activity.fixed;
  const when=rows.length?rows.map(slotText).join(', '):'sem horário livre nesta semana';
  const how=fixed?'horário fixo, informado por você':`${activity.timesPerWeek}× por semana, ${activity.sessionMinutes} min, em horários livres escolhidos pela IA${activity.allowedDays?' nos dias pedidos':''}${activity.preferredWindow?' no período pedido':''}`;
  assumptions.push(`${label}: ${when} (${how}).`);
  if(activity.missing)assumptions.push(`Atenção: ${planner.missingText(activity.name,rows.length,activity.missing,activity.sessionMinutes,'Peça menos vezes por semana ou menos minutos, ou libere outro horário.')}`);
  if(activity.kind==='metas'){
   const sessions=sessionDates(rows,plan.now);
   items.push(record?{op:'update',id:record.id,kind:'metas',data:{title:record.name,weeklyFrequency:activity.timesPerWeek||rows.length||1,sessionMinutes:activity.sessionMinutes,autoSchedule:!fixed,sessions}}:{kind:'metas',data:{title:activity.name,weeklyFrequency:Math.min(7,Math.max(1,activity.timesPerWeek||rows.length||1)),sessionMinutes:Math.min(240,Math.max(15,activity.sessionMinutes)),priority:'MEDIUM',status:'ACTIVE',autoSchedule:!fixed,sessions}});
   continue;
  }
  const flexible=fixed?{}:{isFlexible:true,autoSchedule:true,weeklyFrequency:Math.min(7,activity.timesPerWeek),sessionMinutes:Math.min(240,Math.max(15,activity.sessionMinutes))};
  items.push(record?{op:'update',id:record.id,kind:'rotinas',data:{name:record.name,...flexible,schedules:rows}}:{kind:'rotinas',data:{name:activity.name,type:CATEGORY_LABEL[activity.category]||activity.category||'Organização',isActive:true,isFlexible:!fixed,...flexible,schedules:rows}});
 }
 return {items,assumptions:[...assumptions,...plan.warnings.map(text=>`Atenção: ${text}`)],questions};
}
function mergeActivities(previous,current){
 const key=a=>a.existingId?`${a.kind}:${a.existingId}`:`${a.kind}:${normalize(a.name)}`;
 const merged=new Map(previous.map(a=>[key(a),a]));for(const a of current)merged.set(key(a),a);
 return [...merged.values()];
}
// Builds a reviewable proposal from activities described in the conversation.
async function proposeFromConversation(userId,{message,previousProposalId}){
 const existing=await existingRecords(userId),read=interpret(message,existing);
 if(!read.activities.length)return null;
 const previous=previousProposalId?await prisma.aiRecommendation.findFirst({where:{id:previousProposalId,userId,action:'CREATE_PLAN',status:'PENDING'}}):null;
 const activities=mergeActivities(previous?.changes?.activities||[],read.activities).map(({placements,missing,...a})=>a);
 const plan=await planner.planRequest(userId,activities,{message});
 const built=itemsFrom(plan,existing),{assumptions,questions}=built;
 // A missing fixed commitment could overlap whatever is placed now, so ask before proposing.
 const items=questions.length?[]:built.items;
 const created=items.filter(item=>item.op!=='update').length,updated=items.length-created;
 const message_=items.length?`Montei ${items.length} ${items.length===1?'item':'itens'} para sua revisão${updated?` (${created} novo${created===1?'':'s'} e ${updated} atualização${updated===1?'':'ões'} de cadastros existentes)`:''}, encaixando nos seus horários livres sem conflito com trabalho e compromissos fixos. Nada foi salvo ainda: confira e confirme.`:'Antes de montar, preciso destas informações:';
 const proposal=await prisma.$transaction(async tx=>{
  if(previousProposalId)await tx.aiRecommendation.updateMany({where:{id:previousProposalId,userId,action:'CREATE_PLAN',status:'PENDING'},data:{status:'REJECTED',rejectedAt:new Date()}});
  if(!items.length)return null;
  return tx.aiRecommendation.create({data:{userId,date:new Date(`${plan.now.date}T00:00:00Z`),action:'CREATE_PLAN',targetType:'PLAN',reason:message_,confidence:1,changes:{items,assumptions,activities:plan.activities,fingerprint:plan.fingerprint,source:'conversation'}}});
 });
 return {message:message_,questions,assumptions,draft:items,proposal};
}
// Returns null when the message is not about routines; the caller then asks the language model.
async function respond(userId,input){
 const message=String(input.message||'').trim(),intent=intentOf(message);
 if(intent==='shopping')return {message:'Abra a análise de compras para pesquisar os anúncios e calcular uma estratégia com seu orçamento.',mode:'shopping',query:message};
 if(/financ|salario|despesas|receitas|contas|caixinh|dividas/.test(normalize(message))&&/analis|analise|avali|revis|planej|saldo|quanto|situacao/.test(normalize(message)))return require('./purchaseAdvisor.service').assessFinances(userId);
 if(/\b(?:tirar|tire|remov\w*|exclu\w*|apag\w*|deixar de)\b/.test(normalize(message))&&interpret(message).removal)return {message:'Por segurança, eu não excluo cadastros pela conversa. Para remover uma rotina ou um horário, abra Planejamento, edite o item e salve. Se quiser, depois peça “remonte minha rotina” para eu reorganizar o restante.'};
 if(intent==='week'){
  const {localClock}=require('./personalPlanning.service');
  const profile=await prisma.profile.findUnique({where:{userId},select:{timezone:true}});
  let date=input.date||localClock(new Date(),profile?.timezone||'America/Sao_Paulo').date;
  if(/proxima semana/.test(normalize(message)))date=addDays(date,7);
  const weeklyProposal=await require('./weeklyPlanner.service').proposeWeek(userId,{date,message});
  return {message:weeklyProposal.reason,weeklyProposal};
 }
 if(intent==='build'&&/avali|reavali|revis|analise|mensal|mes\b|ciclo/.test(normalize(message))){const monthlyProposal=await planner.proposeMonth(userId,{message});return {message:monthlyProposal.reason,monthlyProposal}}
 const setup=await proposeFromConversation(userId,{message,previousProposalId:input.previousProposalId});
 if(setup)return setup;
 if(intent==='build'){
  const monthlyProposal=await planner.proposeMonth(userId,{message});
  return {message:monthlyProposal.reason,monthlyProposal};
 }
 return null;
}
module.exports={respond,proposeFromConversation,itemsFrom,existingRecords};
