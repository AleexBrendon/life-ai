const {projectMonths}=require('./financialProjection.service');
const {isDeepStrictEqual}=require('node:util');
const {z}=require('zod');
const prisma=require('../database/prisma');
const {localClock}=require('./personalPlanning.service');
const {key,monthRows,recurrenceOf}=require('./financeBills.service');
const inputSchema=z.object({purchaseIds:z.array(z.number().int().positive()).min(1,'Selecione pelo menos uma compra.').max(30).transform(ids=>[...new Set(ids)]),availableSavingsCents:z.number().int().min(0).max(100000000).default(0),reserveCents:z.number().int().min(0).max(100000000).default(0)});
function shift(month,n){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return key(d).slice(0,7)}
function arrearsFor(bills,today){
 const rows=new Map(),month=today.slice(0,7);
 for(const bill of bills.filter(b=>b.kind==='EXPENSE')){
  const start=key(bill.firstDueDate).slice(0,7);
  for(let i=0,current=start;current<=month&&i<1200;i++,current=shift(start,i)){
   for(const row of monthRows([bill],current,today))if(row.dueDate<today&&row.status!=='PAID')rows.set(row.key,row);
   if(recurrenceOf(bill)==='ONCE')break;
  }
 }
 return [...rows.values()].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.key.localeCompare(b.key));
}
function simulate({bills,entries,today},request){
 const purchases=entries.filter(e=>request.purchaseIds.includes(e.id)&&e.kind==='PURCHASE');
 if(purchases.length!==request.purchaseIds.length)throw Object.assign(Error('Uma das compras selecionadas não foi encontrada.'),{status:404});
 const arrears=arrearsFor(bills,today),overdueKeys=new Set(arrears.map(row=>row.key));
 const debtCents=arrears.reduce((sum,row)=>sum+row.amountCents,0);
 const purchaseCents=purchases.reduce((sum,row)=>sum+Math.max(0,row.amountCents-row.savedCents),0);
 const months=projectMonths({bills,entries,today,reserveCents:request.reserveCents,excludedPurchaseIds:request.purchaseIds,excludedExpenseKeys:overdueKeys});
 const options=[];
 if(purchaseCents>0)for(const [id,title,ratio]of [['priority','Quitar atrasos e depois comprar',1],['breathing','Preservar mais folga mensal',.7]]){
  let cash=request.availableSavingsCents,debt=debtCents,buyMonth=null,debtMonth=debt===0?today.slice(0,7):null,valid=true;const schedule=[];
  for(const month of months){
   cash+=month.capacityCents<0?month.capacityCents:Math.floor(month.capacityCents*ratio);
   if(cash<0){valid=false;break;}
   const debtPaymentCents=Math.min(cash,debt);debt-=debtPaymentCents;cash-=debtPaymentCents;
   if(!debt&&!debtMonth)debtMonth=month.month;
   let purchasePaymentCents=0;
   if(!debt&&!buyMonth&&cash>=purchaseCents){buyMonth=month.month;cash-=purchaseCents;purchasePaymentCents=purchaseCents;}
   schedule.push({...month,debtPaymentCents,purchasePaymentCents,remainingDebtCents:debt,purchaseFundCents:buyMonth?0:cash,extraBufferCents:month.capacityCents>0?month.capacityCents-Math.floor(month.capacityCents*ratio):0});
  }
  if(valid&&buyMonth)options.push({id,title,debtCents,purchaseCents,debtMonth,buyMonth,monthlySharePercent:Math.round(ratio*100),schedule,note:ratio===1?'Usa a sobra após contas, compromissos e reserva para quitar atrasos antes de comprar à vista.':'Destina 70% da sobra ao plano e mantém 30% de folga adicional, além da reserva. Não usa crédito.'});
 }
 return {today,arrears,purchases:purchases.map(p=>({id:p.id,title:p.title,remainingCents:Math.max(0,p.amountCents-p.savedCents)})),debtCents,purchaseCents,months,options,notes:['Atrasos entram uma única vez e são priorizados antes da compra. Não repita aqui uma dívida já cadastrada como conta.','O dinheiro disponível informado deve estar separado dos valores já guardados nas compras e da sua reserva.','Valores de atrasos devem incluir juros e multas atualizados. Não são presumidos descontos ou acordos com credores.','A projeção usa 24 meses, rendas fixas e variáveis já recebidas. Renda extra futura não garante parcelas.','Contas vinculadas ao orçamento entram apenas pelo vencimento. Registros independentes são considerados compromissos separados.']};
}
async function context(userId,db=prisma){
 const [profile,bills,entries]=await Promise.all([db.profile.findUnique({where:{userId},select:{timezone:true}}),db.financeBill.findMany({where:{userId},include:{occurrences:{include:{history:true}}}}),db.financeEntry.findMany({where:{userId},orderBy:{id:'asc'}})]);
 let today;try{today=localClock(new Date(),profile?.timezone).date}catch{today=localClock(new Date()).date}return {today,bills,entries};
}
async function overview(userId){const ctx=await context(userId);return {today:ctx.today,arrears:arrearsFor(ctx.bills,ctx.today),purchases:ctx.entries.filter(e=>e.kind==='PURCHASE'),plans:await prisma.aiRecommendation.findMany({where:{userId,action:'DEBT_PURCHASE_PLAN'},orderBy:{createdAt:'desc'},take:5})}}
async function preview(userId,input){const request=inputSchema.parse(input),result=simulate(await context(userId),request);return prisma.aiRecommendation.create({data:{userId,date:new Date(result.today+'T00:00:00Z'),action:'DEBT_PURCHASE_PLAN',targetType:'PURCHASE',reason:'Planejamento de atrasos e compras com prioridade às dívidas e preservação de reserva.',confidence:0,changes:{request,...result}}})}
async function choose(userId,id,optionId){return prisma.$transaction(async tx=>{
 const proposal=await tx.aiRecommendation.findFirst({where:{id,userId,action:'DEBT_PURCHASE_PLAN',status:'PENDING'}});if(!proposal)throw Object.assign(Error('Simulação pendente não encontrada.'),{status:404});
 const fresh=simulate(await context(userId,tx),inputSchema.parse(proposal.changes.request));const option=fresh.options.find(o=>o.id===optionId),original=proposal.changes.options.find(o=>o.id===optionId);
 if(!option||!isDeepStrictEqual(option,original))throw Object.assign(Error('O orçamento mudou. Calcule as opções novamente.'),{status:409});
 const claimed=await tx.aiRecommendation.updateMany({where:{id,userId,status:'PENDING'},data:{status:'APPROVED',approvedAt:new Date(),result:{optionId,option}}});if(!claimed.count)throw Object.assign(Error('Esta simulação já foi escolhida.'),{status:409});return {optionId,option};
 },{isolationLevel:'Serializable',timeout:20000}).catch(e=>{if(e.code==='P2034')throw Object.assign(Error('O orçamento mudou. Calcule novamente.'),{status:409});throw e})}
module.exports={inputSchema,arrearsFor,simulate,overview,preview,choose};
