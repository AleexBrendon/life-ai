const express=require('express');
const {z}=require('zod');
const prisma=require('../database/prisma');
const auth=require('../middlewares/auth.middleware');
const {localClock}=require('../services/personalPlanning.service');
const {key,date,validDate,datesInMonth,recurrenceOf,monthRows,projectBill,summarize}=require('../services/financeBills.service');
const router=express.Router();router.use(auth);
const day=z.string().refine(validDate,'Informe uma data válida.');
const monthSchema=z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/);
const schema=z.object({sourceEntryId:z.number().int().positive().optional(),title:z.string().trim().min(1).max(100),kind:z.enum(['INCOME','EXPENSE']),isVariable:z.boolean().default(false),category:z.string().trim().min(1).max(60),description:z.string().trim().max(2000).default(''),amountCents:z.number().int().min(1).max(100000000),firstDueDate:day,monthly:z.boolean().optional(),recurrence:z.enum(['ONCE','WEEKLY','FORTNIGHTLY','MONTHLY','BIMONTHLY','QUARTERLY','SEMIANNUAL','YEARLY']).optional(),endDate:day.nullish()})
 .transform(row=>({...row,recurrence:row.recurrence||(row.monthly?'MONTHLY':'ONCE'),monthly:(row.recurrence||(row.monthly?'MONTHLY':'ONCE'))==='MONTHLY'}))
 .refine(row=>!row.endDate||row.recurrence!=='ONCE'&&row.endDate>=row.firstDueDate,{message:'O fim da recorrência deve ser igual ou posterior ao primeiro vencimento.'});
const statusSchema=z.object({referenceDate:day,status:z.enum(['PENDING','PAID','UNPAID','POSTPONED']),dueDate:day.optional(),paidAt:day.optional(),reason:z.string().trim().max(2000).default('')});
function fail(status,message){throw Object.assign(new Error(message),{status})}
function parse(schema,value){const r=schema.safeParse(value);if(!r.success)fail(400,r.error.issues.map(i=>i.message).join(' '));return r.data}
function id(req){const n=Number(req.params.id);if(!Number.isSafeInteger(n)||n<1)fail(400,'Conta inválida.');return n}
const route=fn=>async(req,res)=>{try{await fn(req,res)}catch(e){res.status(e.status||500).json({success:false,message:e.status?e.message:'Não foi possível atualizar o financeiro.'})}};
async function today(userId){const profile=await prisma.profile.findUnique({where:{userId},select:{timezone:true}});try{return localClock(new Date(),profile?.timezone).date}catch{return localClock(new Date()).date}}
const include={occurrences:{include:{history:{orderBy:{createdAt:'desc'}}}}};
async function owned(userId,billId,db=prisma){const bill=await db.financeBill.findFirst({where:{id:billId,userId},include});if(!bill)fail(404,'Conta não encontrada.');return bill}
router.get('/',route(async(req,res)=>{
 const clock=await today(req.user.id),month=parse(monthSchema,req.query.month||clock.slice(0,7));
 const bills=await prisma.financeBill.findMany({where:{userId:req.user.id},include,orderBy:{id:'asc'}});
 const rows=monthRows(bills,month,clock);
 const months=Array.from({length:6},(_,i)=>{const d=date(`${month}-01`);d.setUTCMonth(d.getUTCMonth()-5+i);return key(d).slice(0,7)});
 res.json({success:true,data:{month,today:clock,rows,summary:summarize(rows,month),trend:months.map(m=>({month:m,...summarize(monthRows(bills,m,clock),m)}))}});
}));
router.get('/source/:id',route(async(req,res)=>{
 const entry=await prisma.financeEntry.findFirst({where:{id:id(req),userId:req.user.id}});if(!entry)fail(404,'Registro não encontrado.');
 const bill=await prisma.financeBill.findFirst({where:{sourceEntryId:entry.id,userId:req.user.id},include});
 res.json({success:true,data:bill?projectBill(bill,key(bill.firstDueDate),await today(req.user.id)).bill:null});
}));
async function syncSource(tx,userId,data){
 if(!data.sourceEntryId)return;
 const source=await tx.financeEntry.findFirst({where:{id:data.sourceEntryId,userId}});
 if(!source||!['INCOME','EXPENSE'].includes(source.kind))fail(400,'Origem financeira inválida.');
 if(source.kind!==data.kind)fail(400,'Preserve o tipo do registro de origem.');
 await tx.financeEntry.update({where:{id:source.id},data:{title:data.title,category:data.category,amountCents:data.amountCents,isVariable:data.isVariable}});
}
router.post('/',route(async(req,res)=>{
 const data=parse(schema,req.body);
 const bill=await prisma.$transaction(async tx=>{
  await syncSource(tx,req.user.id,data);
  if(data.sourceEntryId&&await tx.financeBill.findUnique({where:{sourceEntryId:data.sourceEntryId}}))fail(409,'Este registro já possui vencimento. Abra novamente para editá-lo.');
  return tx.financeBill.create({data:{...data,firstDueDate:date(data.firstDueDate),endDate:data.endDate?date(data.endDate):null,userId:req.user.id}});
 });
 res.status(201).json({success:true,data:bill});
}));
router.put('/:id',route(async(req,res)=>{
 const data=parse(schema,req.body),billId=id(req);
 await prisma.$transaction(async tx=>{
  const bill=await owned(req.user.id,billId,tx);
  if(bill.occurrences.length&&(key(bill.firstDueDate)!==data.firstDueDate||recurrenceOf(bill)!==data.recurrence||bill.kind!==data.kind))fail(400,'Esta conta já tem histórico. Preserve o tipo e o início da recorrência; crie outra conta para mudar esses dados.');
  if(data.endDate&&bill.occurrences.some(o=>key(o.referenceDate)>data.endDate))fail(400,'O fim da recorrência não pode remover meses com histórico.');
  if(data.sourceEntryId&&data.sourceEntryId!==bill.sourceEntryId)fail(400,'Não é possível trocar a origem da conta.');
  await syncSource(tx,req.user.id,{...data,sourceEntryId:bill.sourceEntryId});
  await tx.financeBill.update({where:{id:bill.id},data:{...data,firstDueDate:date(data.firstDueDate),endDate:data.endDate?date(data.endDate):null}});
 });res.json({success:true});
}));
router.delete('/:id',route(async(req,res)=>{
 const result=await prisma.financeBill.deleteMany({where:{id:id(req),userId:req.user.id}});if(!result.count)fail(404,'Conta não encontrada.');res.json({success:true});
}));
router.put('/:id/status',route(async(req,res)=>{
 const body=parse(statusSchema,req.body),clock=await today(req.user.id),billId=id(req);
 const result=await prisma.$transaction(async tx=>{
  const bill=await owned(req.user.id,billId,tx);
  if(!datesInMonth(bill,body.referenceDate.slice(0,7)).includes(body.referenceDate))fail(400,'Este vencimento não pertence à conta.');
  const current=projectBill(bill,body.referenceDate,clock);
  let dueDate=current.dueDate,paidAt=null;
  if(body.status==='POSTPONED'){
   if(!body.dueDate||body.dueDate<=current.dueDate||body.dueDate<clock)fail(400,'Escolha uma nova data futura, posterior ao vencimento atual.');
   dueDate=body.dueDate;
  }
  if(body.status==='PENDING')dueDate=body.referenceDate;
  if(body.status==='PAID'){
   if(!body.paidAt||body.paidAt>clock)fail(400,'Informe uma data de pagamento válida, até hoje.');
   paidAt=body.paidAt;
  }
  if((['POSTPONED','UNPAID'].includes(body.status)||body.status==='PAID'&&paidAt>body.referenceDate)&&!body.reason)fail(400,'Informe o motivo do adiamento, atraso ou não pagamento.');
  const data={status:body.status,dueDate:date(dueDate),paidAt:paidAt?date(paidAt):null,reason:body.reason||null};
  const occurrence=await tx.financeBillOccurrence.upsert({where:{billId_referenceDate:{billId,referenceDate:date(body.referenceDate)}},create:{...data,billId,referenceDate:date(body.referenceDate),amountCents:bill.amountCents},update:data});
  await tx.financeBillEvent.create({data:{...data,occurrenceId:occurrence.id}});
  return occurrence;
 });res.json({success:true,data:result});
}));
module.exports=router;
