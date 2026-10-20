import {beforeAll,afterAll,it,expect} from 'vitest';
const prisma=require('../../src/database/prisma'),redis=require('../../src/database/redis'),app=require('../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
const users=[],tokens=[];let notice;
const call=(id,owner=0)=>request(app).post(`/api/notifications/${id}/drink`).set('Authorization',`Bearer ${tokens[owner]}`);
beforeAll(async()=>{for(let i=0;i<2;i++){const user=await prisma.user.create({data:{name:'Copo teste',email:`water-confirm-${Date.now()}-${i}@example.invalid`,passwordHash:'not-used'}});users.push(user.id);tokens.push(jwt.sign({sub:String(user.id)},process.env.JWT_SECRET,{expiresIn:'5m'}))}notice=await prisma.notification.create({data:{userId:users[0],title:'Água',message:'Beber água',type:'HYDRATION',isRead:true}})});
afterAll(async()=>{if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
it('registra exatamente 250 ml, inclusive em aviso já lido, e não duplica ao confirmar novamente',async()=>{
 expect((await call(notice.id,1)).status).toBe(404);
 const responses=await Promise.all([call(notice.id),call(notice.id)]);expect(responses.every(response=>response.status===200)).toBe(true);
 expect(responses.filter(response=>response.body.data.recorded)).toHaveLength(1);
 const rows=await prisma.waterIntake.findMany({where:{userId:users[0]}});expect(rows).toHaveLength(1);expect(rows[0].amountMl).toBe(250);
 const saved=await prisma.notification.findUnique({where:{id:notice.id}});expect(saved.isRead).toBe(true);expect(saved.hydrationConfirmedAt).toBeTruthy();
 expect((await call(notice.id)).body.data.recorded).toBe(false);
});
it('não confirma avisos de outras categorias como consumo de água',async()=>{
 const other=await prisma.notification.create({data:{userId:users[0],title:'Outro',message:'Outra atividade',type:'ACTIVITY'}});
 expect((await call(other.id)).status).toBe(404);expect(await prisma.waterIntake.count({where:{userId:users[0]}})).toBe(1);
});
