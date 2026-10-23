import {beforeAll,afterAll,it,expect} from 'vitest';
const prisma=require('../../src/database/prisma'),redis=require('../../src/database/redis'),app=require('../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
const users=[],tokens=[];let billId,today,newDate;
const call=(method,path,body,owner=0)=>request(app)[method](`/api/personal/finance-bills${path}`).set('Authorization',`Bearer ${tokens[owner]}`).send(body);
const base={title:'Conta mensal teste',kind:'EXPENSE',category:'Moradia',description:'Teste isolado',amountCents:10000,firstDueDate:'2026-01-31',monthly:true};
beforeAll(async()=>{for(let i=0;i<2;i++){const user=await prisma.user.create({data:{name:'Financeiro teste',email:`bills-${Date.now()}-${i}@example.invalid`,passwordHash:'not-used'}});users.push(user.id);tokens.push(jwt.sign({sub:String(user.id)},process.env.JWT_SECRET,{expiresIn:'10m'}))}const response=await call('get','?month=2026-01');today=response.body.data.today;const future=new Date(today+'T12:00:00Z');future.setUTCDate(15);future.setUTCMonth(future.getUTCMonth()+1);newDate=future.toISOString().slice(0,10)});
afterAll(async()=>{if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
it('exige autenticação, valida datas e persiste conta mensal',async()=>{
 expect((await request(app).get('/api/personal/finance-bills')).status).toBe(401);
 expect((await call('post','',{...base,firstDueDate:'2026-02-30'})).status).toBe(400);
 expect((await call('post','',{...base,amountCents:1.5})).status).toBe(400);
 const response=await call('post','',base);expect(response.status).toBe(201);billId=response.body.data.id;
 expect((await call('get','?month=2026-02')).body.data.rows[0].referenceDate).toBe('2026-02-28');
 expect((await call('get','?month=2026-02',undefined,1)).body.data.rows).toEqual([]);
 expect((await call('put',`/${billId}`,base,1)).status).toBe(404);
 expect((await call('delete',`/${billId}`,undefined,1)).status).toBe(404);
});
it('adiamento exige motivo e nova data, mantém outros meses e aparece no mês de destino',async()=>{
 const body={referenceDate:'2026-01-31',status:'POSTPONED',dueDate:newDate};
 expect((await call('put',`/${billId}/status`,body)).status).toBe(400);
 expect((await call('put',`/${billId}/status`,{...body,reason:'Pagamento do cliente atrasou'},1)).status).toBe(404);
 expect((await call('put',`/${billId}/status`,{...body,reason:'Pagamento do cliente atrasou'})).status).toBe(200);
 const original=(await call('get','?month=2026-01')).body.data;
 expect(original.rows[0]).toMatchObject({status:'POSTPONED',dueDate:newDate,reason:'Pagamento do cliente atrasou'});expect(original.summary.expenseCents).toBe(0);
 const moved=(await call('get',`?month=${newDate.slice(0,7)}`)).body.data.rows;expect(moved.some(row=>row.referenceDate==='2026-01-31'&&row.dueDate===newDate)).toBe(true);
 expect((await call('get','?month=2026-02')).body.data.rows[0].dueDate).toBe('2026-02-28');
});
it('pagamento atrasado exige motivo, registra a data e preserva o histórico e o valor',async()=>{
 const body={referenceDate:'2026-01-31',status:'PAID',paidAt:today};
 expect((await call('put',`/${billId}/status`,body)).status).toBe(400);
 expect((await call('put',`/${billId}/status`,{...body,reason:'Pagamento regularizado'})).status).toBe(200);
 const row=(await call('get','?month=2026-01')).body.data.rows[0];expect(row).toMatchObject({status:'PAID',paidAt:today,reason:'Pagamento regularizado'});expect(row.history).toHaveLength(2);
 expect((await call('put',`/${billId}`,{...base,amountCents:20000})).status).toBe(200);
 expect((await call('get','?month=2026-01')).body.data.rows[0].amountCents).toBe(10000);
 expect((await call('get','?month=2026-02')).body.data.rows[0].amountCents).toBe(20000);
 expect((await call('put',`/${billId}`,{...base,firstDueDate:'2026-01-15'})).status).toBe(400);
});
it('não paga exige justificativa, pendente preserva histórico e exclusão remove apenas dados próprios',async()=>{
 const body={referenceDate:'2026-02-28',status:'UNPAID'};
 expect((await call('put',`/${billId}/status`,body)).status).toBe(400);
 expect((await call('put',`/${billId}/status`,{...body,reason:'Sem saldo'})).status).toBe(200);
 expect((await call('put',`/${billId}/status`,{...body,status:'PENDING'})).status).toBe(200);
 const row=(await call('get','?month=2026-02')).body.data.rows[0];expect(row.history).toHaveLength(2);expect(row.dueDate).toBe('2026-02-28');
 expect((await call('delete',`/${billId}`)).status).toBe(200);
 expect(await prisma.financeBillOccurrence.count({where:{billId}})).toBe(0);
 expect((await call('get','?month=2026-01')).body.data.rows).toEqual([]);
});

it('salva categorias próprias e recorrência semanal com pagamentos independentes',async()=>{
 const response=await call('post','',{...base,title:'Compra semanal',category:'Feira do bairro',recurrence:'WEEKLY',firstDueDate:'2026-01-02',endDate:'2026-02-28'});
 expect(response.status).toBe(201);const id=response.body.data.id;
 let rows=(await call('get','?month=2026-01')).body.data.rows;
 expect(rows).toHaveLength(5);expect(rows.every(row=>row.category==='Feira do bairro')).toBe(true);
 expect((await call('put',`/${id}/status`,{referenceDate:'2026-01-03',status:'PENDING'})).status).toBe(400);
 expect((await call('put',`/${id}/status`,{referenceDate:'2026-01-09',status:'PAID',paidAt:'2026-01-09'})).status).toBe(200);
 rows=(await call('get','?month=2026-01')).body.data.rows;
 expect(rows.filter(row=>row.status==='PAID')).toHaveLength(1);
 expect((await call('put',`/${id}`,{...base,recurrence:'MONTHLY',firstDueDate:'2026-01-02'})).status).toBe(400);
 expect((await call('get','?month=2026-03')).body.data.rows).toEqual([]);
 await call('delete',`/${id}`);
});

it('vincula vencimento ao orçamento, reabre dados e sincroniza alterações sem duplicar',async()=>{
 const entry=await prisma.financeEntry.create({data:{userId:users[0],kind:'EXPENSE',title:'Origem teste',amountCents:5000}});
 const payload={...base,sourceEntryId:entry.id,title:'Nome atualizado',category:'Saúde',description:'Descrição persistida',amountCents:7500,recurrence:'WEEKLY',firstDueDate:'2026-01-02'};
 const created=await call('post','',payload);expect(created.status).toBe(201);const id=created.body.data.id;
 expect((await call('get','/source/'+entry.id)).body.data).toMatchObject({id,sourceEntryId:entry.id,category:'Saúde',description:'Descrição persistida',recurrence:'WEEKLY',amountCents:7500});
 expect(await prisma.financeEntry.findUnique({where:{id:entry.id}})).toMatchObject({category:'Saúde',title:'Nome atualizado',amountCents:7500});
 expect((await call('post','',payload)).status).toBe(409);
 expect((await call('get','/source/'+entry.id,undefined,1)).status).toBe(404);
 expect((await call('put','/'+id,{...payload,category:'Educação',amountCents:9000})).status).toBe(200);
 expect((await call('get','/source/'+entry.id)).body.data).toMatchObject({category:'Educação',amountCents:9000});
 expect(await prisma.financeEntry.findUnique({where:{id:entry.id}})).toMatchObject({category:'Educação',amountCents:9000});
 await call('delete','/'+id);
});
