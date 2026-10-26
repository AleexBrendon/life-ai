import {beforeAll,afterAll,it,expect} from 'vitest';
const prisma=require('../../src/database/prisma'),redis=require('../../src/database/redis'),app=require('../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
let userId,token;
const get=query=>request(app).get('/api/dashboard/insights').set('Authorization',`Bearer ${token}`).query(query);
beforeAll(async()=>{
 const user=await prisma.user.create({data:{name:'Filtro de histórico',email:`history-range-${Date.now()}@example.invalid`,passwordHash:'not-used',profile:{create:{timezone:'America/Sao_Paulo'}}}});userId=user.id;token=jwt.sign({sub:String(userId)},process.env.JWT_SECRET,{expiresIn:'10m'});
 const goal=await prisma.goal.create({data:{userId,title:'Registros para o filtro'}});
 await prisma.goalPlanSession.createMany({data:[{goalId:goal.id,date:new Date('2024-02-28'),startTime:'10:00',endTime:'11:00',status:'COMPLETED'},{goalId:goal.id,date:new Date('2024-03-01'),startTime:'10:00',endTime:'11:00',status:'COMPLETED'},{goalId:goal.id,date:new Date('2024-03-02'),startTime:'10:00',endTime:'11:00',status:'COMPLETED'}]});
});
afterAll(async()=>{if(userId)await prisma.user.delete({where:{id:userId}});await prisma.$disconnect();redis.disconnect()});
it('consulta o período personalizado com ambos os extremos e isola registros fora dele',async()=>{
 const response=await get({startDate:'2024-02-28',endDate:'2024-03-01'});
 expect(response.status).toBe(200);expect(response.body.data).toMatchObject({startDate:'2024-02-28',endDate:'2024-03-01',days:3,summary:{completed:2,total:2}});
 const single=await get({startDate:'2024-02-28',endDate:'2024-02-28'});expect(single.body.data.summary.completed).toBe(1);
});
it('permite atalhos menores e até um ano e rejeita consultas fora do limite',async()=>{
 for(const days of [1,3,15,365]){const response=await get({days});expect(response.status).toBe(200);expect(response.body.data.daily).toHaveLength(days)}
 for(const query of [{days:366},{days:0},{startDate:'2024-01-01',endDate:'2025-01-01'},{startDate:'2024-03-02',endDate:'2024-03-01'},{startDate:'2024-02-30',endDate:'2024-03-01'}])expect((await get(query)).status).toBe(400);
});
