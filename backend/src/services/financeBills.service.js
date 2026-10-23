const key = value => typeof value === 'string' ? value.slice(0,10) : value.toISOString().slice(0,10);
const date = value => new Date(`${value}T00:00:00Z`);
function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date(value).getTime()) && key(date(value)) === value; }
const recurrenceOf = bill => bill.recurrence && bill.recurrence !== 'ONCE' ? bill.recurrence : (bill.monthly ? 'MONTHLY' : 'ONCE');
function datesInMonth(bill, month) {
 const first=key(bill.firstDueDate), recurrence=recurrenceOf(bill), end=bill.endDate?key(bill.endDate):'9999-12-31';
 if(recurrence==='ONCE')return first.startsWith(month)&&first<=end?[first]:[];
 const [year,m]=month.split('-').map(Number), monthStart=date(month+'-01'), monthEnd=new Date(Date.UTC(year,m,0));
 if(['WEEKLY','FORTNIGHTLY'].includes(recurrence)){
  const step=recurrence==='WEEKLY'?7:14, elapsed=Math.max(0,Math.ceil((monthStart-date(first))/86400000/step));
  const cursor=date(first);cursor.setUTCDate(cursor.getUTCDate()+elapsed*step);const dates=[];
  for(;cursor<=monthEnd&&key(cursor)<=end;cursor.setUTCDate(cursor.getUTCDate()+step))dates.push(key(cursor));
  return dates;
 }
 const interval={MONTHLY:1,BIMONTHLY:2,QUARTERLY:3,SEMIANNUAL:6,YEARLY:12}[recurrence];
 const diff=(year-Number(first.slice(0,4)))*12+m-Number(first.slice(5,7));
 if(!interval||diff<0||diff%interval)return [];
 const due=month+'-'+String(Math.min(Number(first.slice(-2)),monthEnd.getUTCDate())).padStart(2,'0');
 return due>=first&&due<=end?[due]:[];
}
function dueInMonth(bill,month){return datesInMonth(bill,month)[0]||null;}
function projectBill(bill, referenceDate, today) {
 const occurrence = bill.occurrences?.find(row=>key(row.referenceDate)===referenceDate);
 const dueDate = occurrence ? key(occurrence.dueDate) : referenceDate;
 const storedStatus = occurrence?.status || 'PENDING';
 return { key:`${bill.id}:${referenceDate}`,billId:bill.id,title:bill.title,kind:bill.kind,isVariable:bill.isVariable,category:bill.category,description:bill.description,
  amountCents:occurrence?.amountCents ?? bill.amountCents,referenceDate,dueDate,storedStatus,
  status:storedStatus !== 'PAID' && dueDate < today ? 'UNPAID' : storedStatus,
  overdue:storedStatus !== 'PAID' && dueDate < today,paidAt:occurrence?.paidAt ? key(occurrence.paidAt) : null,
  reason:occurrence?.reason || '',history:occurrence?.history || [],
  bill:{id:bill.id,sourceEntryId:bill.sourceEntryId,title:bill.title,kind:bill.kind,isVariable:bill.isVariable,category:bill.category,description:bill.description||'',amountCents:bill.amountCents,firstDueDate:key(bill.firstDueDate),monthly:bill.monthly,recurrence:recurrenceOf(bill),endDate:bill.endDate ? key(bill.endDate) : ''} };
}
function monthRows(bills,month,today) {
 const rows=new Map();
 for(const bill of bills){
  for(const reference of datesInMonth(bill,month))rows.set(`${bill.id}:${reference}`,projectBill(bill,reference,today));
  for(const occurrence of bill.occurrences||[])if(key(occurrence.dueDate).slice(0,7)===month){const referenceDate=key(occurrence.referenceDate);rows.set(`${bill.id}:${referenceDate}`,projectBill(bill,referenceDate,today));}
 }
 return [...rows.values()].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.title.localeCompare(b.title));
}
function summarize(rows,month) {
 const current=rows.filter(row=>row.dueDate.startsWith(month));
 const sum=fn=>current.filter(fn).reduce((total,row)=>total+row.amountCents,0);
 const incomeCents=sum(row=>row.kind==='INCOME'),expenseCents=sum(row=>row.kind==='EXPENSE');
 return {incomeCents,expenseCents,balanceCents:incomeCents-expenseCents,
  paidCents:sum(row=>row.kind==='EXPENSE'&&row.status==='PAID'),receivedCents:sum(row=>row.kind==='INCOME'&&row.status==='PAID'),
  pendingCents:sum(row=>row.kind==='EXPENSE'&&row.status!=='PAID'),overdueCents:sum(row=>row.kind==='EXPENSE'&&row.overdue),
  cashCents:sum(row=>row.kind==='INCOME'&&row.status==='PAID')-sum(row=>row.kind==='EXPENSE'&&row.status==='PAID')};
}
module.exports={datesInMonth,recurrenceOf,key,date,validDate,dueInMonth,projectBill,monthRows,summarize};
