import {beforeAll,afterAll,it,expect} from 'vitest';
const prisma=require('../../src/database/prisma'),redis=require('../../src/database/redis'),app=require('../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
const users=[],tokens=[];let purchaseId,proposalId;
const call=(method,path,body,owner=0)=>request(app)[method]('/api/personal/debt-plans'+path).set('Authorization',`Bearer ${tokens[owner]}`).send(body);
beforeAll(async()=>{for(let i=0;i<2;i++){const u=await prisma.user.create({data:{name:'Plano teste',email:`debt-plan-${Date.now()}-${i}@example.invalid`,passwordHash:'not-used'}});users.push(u.id);tokens.push(jwt.sign({sub:String(u.id)},process.env.JWT_SECRET,{expiresIn:'10m'}))}
 await prisma.financeEntry.create({data:{userId:users[0],kind:'INCOME',title:'Salário',amountCents:500000}});
 const purchase=await prisma.financeEntry.create({data:{userId:users[0],kind:'PURCHASE',title:'Notebook',amountCents:200000,installments:4}});purchaseId=purchase.id;
 await prisma.financeBill.create({data:{userId:users[0],title:'Atraso teste',kind:'EXPENSE',amountCents:100000,firstDueDate:new Date('2026-01-10'),recurrence:'ONCE'}});
});
afterAll(async()=>{if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
it('lista os atrasos próprios e valida os cadastros selecionados',async()=>{
 expect((await request(app).get('/api/personal/debt-plans')).status).toBe(401);
 expect((await call('get','')).body.data.arrears).toHaveLength(1);
 expect((await call('get','',undefined,1)).body.data.arrears).toHaveLength(0);
 expect((await call('post','',{purchaseIds:[]})).status).toBe(400);
 expect((await call('post','',{purchaseIds:[purchaseId]},1)).status).toBe(404);
});
it('persiste a simulação e a escolha sem pagar contas ou criar parcelas',async()=>{
 const response=await call('post','',{purchaseIds:[purchaseId]});expect(response.status).toBe(201);proposalId=response.body.data.id;
 expect(response.body.data.changes.options).toHaveLength(2);
 expect((await call('post',`/${proposalId}/choose`,{optionId:'priority'},1)).status).toBe(404);
 expect((await call('post',`/${proposalId}/choose`,{optionId:'priority'})).status).toBe(200);
 const saved=await prisma.aiRecommendation.findUnique({where:{id:proposalId}});expect(saved.status).toBe('APPROVED');expect(saved.result.optionId).toBe('priority');
 expect(await prisma.financeBillOccurrence.count({where:{bill:{userId:users[0]}}})).toBe(0);
 expect(await prisma.financeEntry.count({where:{userId:users[0],kind:'PURCHASE'}})).toBe(1);
 expect((await call('post',`/${proposalId}/choose`,{optionId:'breathing'})).status).toBe(404);
});
it('revalida o orçamento antes de salvar a alternativa',async()=>{
 const response=await call('post','',{purchaseIds:[purchaseId]});expect(response.status).toBe(201);
 await prisma.financeEntry.updateMany({where:{userId:users[0],kind:'INCOME'},data:{amountCents:10000}});
 expect((await call('post',`/${response.body.data.id}/choose`,{optionId:'priority'})).status).toBe(409);
 expect((await prisma.aiRecommendation.findUnique({where:{id:response.body.data.id}})).status).toBe('PENDING');
});
