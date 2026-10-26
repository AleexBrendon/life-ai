const {monthRows,recurrenceOf,key}=require('./financeBills.service');
const variable=row=>row.isVariable===true||/freela|b[oô]nus|comiss|extra/i.test(`${row.title||''} ${row.category||''}`);
function shift(month,n){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return key(d).slice(0,7)}
function allocation(entry,index){
 const remaining=Math.max(0,entry.amountCents-(entry.savedCents||0));
 const monthly=entry.kind==='PURCHASE'?Math.ceil(remaining/Math.max(1,entry.installments||1)):entry.kind==='BOX'?entry.monthlyCents||0:0;
 return Math.max(0,Math.min(monthly,remaining-index*monthly));
}
// Explicit sourceEntryId links are the only authority for deduplication. Different accounts add up.
function projectMonths({bills,entries,today,reserveCents=0,excludedPurchaseIds=[],excludedExpenseKeys=new Set()}){
 const linked=new Set(bills.map(row=>row.sourceEntryId).filter(Boolean)),independent=entries.filter(row=>!linked.has(row.id));
 const commitments=entries.filter(row=>!excludedPurchaseIds.includes(row.id));
 const payments=[];
 for(const bill of bills)for(const occurrence of bill.occurrences||[]){
  if(occurrence.status!=='PAID')continue;
  const paidAt=key(occurrence.paidAt||occurrence.dueDate);
  if(paidAt>today)continue;
  payments.push({key:`${bill.id}:${key(occurrence.referenceDate)}`,title:bill.title,kind:bill.kind,amountCents:occurrence.amountCents??bill.amountCents,date:paidAt,source:'bill',status:'PAID'});
 }
 return Array.from({length:24},(_,index)=>{
  const month=shift(today.slice(0,7),index),sources=[];
  for(const entry of independent)if(['INCOME','EXPENSE'].includes(entry.kind)&&!(entry.kind==='INCOME'&&variable(entry)))sources.push({key:'entry:'+entry.id,title:entry.title,kind:entry.kind,amountCents:entry.amountCents,source:'entry',status:'PROJECTED'});
  for(const row of monthRows(bills,month,today)){
   if(!row.dueDate.startsWith(month)||row.storedStatus==='PAID'||row.kind==='EXPENSE'&&excludedExpenseKeys.has(row.key))continue;
   if(row.kind==='INCOME'&&(variable(row)||recurrenceOf(row.bill)==='ONCE'))continue;
   sources.push({key:row.key,title:row.title,kind:row.kind,amountCents:row.amountCents,date:row.dueDate,source:'bill',status:row.status});
  }
  sources.push(...payments.filter(row=>row.date.startsWith(month)&&!(row.kind==='EXPENSE'&&excludedExpenseKeys.has(row.key))));
  const incomeCents=sources.filter(row=>row.kind==='INCOME').reduce((sum,row)=>sum+row.amountCents,0),expenseCents=sources.filter(row=>row.kind==='EXPENSE').reduce((sum,row)=>sum+row.amountCents,0);
  const allocatedCents=commitments.reduce((sum,row)=>sum+allocation(row,index),0),reserve=Math.max(reserveCents,Math.ceil(incomeCents*.1));
  return {month,incomeCents,expenseCents,allocatedCents,reserveCents:reserve,capacityCents:incomeCents-expenseCents-allocatedCents-reserve,sources};
 });
}
module.exports={projectMonths,variable,allocation};
