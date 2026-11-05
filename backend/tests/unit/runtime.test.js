import { describe, it, expect, vi } from 'vitest';
const { validateEnvironment } = require('../../src/config/environment');
const errorMiddleware = require('../../src/middlewares/error.middleware');
const { plannerQuerySchema, executionDateFilter } = require('../../src/schemas/plannerQuery.schema');
const { deliverUpcomingNotifications } = require('../../src/services/upcomingDelivery.service');
const { createAuthRateLimit } = require('../../src/middlewares/authRateLimit.middleware');
const response = () => { const res = { statusCode: 200, headers: {}, setHeader(k,v) {this.headers[k]=v;}, status(n) {this.statusCode=n;return this;}, json(body) {this.body=body;return this;} }; return res; };
describe('runtime sem banco de dados', () => {
 it('valida configuração sem revelar credenciais', () => {
  const env = { DATABASE_URL: 'postgresql://u:secret@localhost/life', REDIS_URL: 'redis://localhost', JWT_SECRET: 'secret' };
  expect(validateEnvironment(env)).toEqual({port:3000});
  expect(() => validateEnvironment({...env, PORT:'0'})).toThrow('PORT');
  expect(() => validateEnvironment({...env, REDIS_URL:'https://secret'})).toThrow('REDIS_URL');
  expect(() => validateEnvironment({...env, JWT_SECRET:''})).toThrow('JWT_SECRET');
 });
 it('devolve erros JSON seguros e preserva respostas já iniciadas', () => {
  const res=response(),next=vi.fn();
  errorMiddleware({type:'entity.parse.failed',message:'sensitive'}, {}, res, next);
  expect(res.statusCode).toBe(400);expect(res.body).toEqual({success:false,message:'JSON inválido.'});
  const started={headersSent:true};const error=new Error('secret');errorMiddleware(error,{},started,next);expect(next).toHaveBeenCalledWith(error);
 });
 it('valida limites e datas reais sem mudar consultas antigas', () => {
  expect(plannerQuerySchema.parse({})).toEqual({});
  expect(plannerQuerySchema.safeParse({limit:101}).success).toBe(false);
  expect(plannerQuerySchema.safeParse({from:'2026-02-30'}).success).toBe(false);
  expect(plannerQuerySchema.safeParse({from:'2026-11-05',to:'2026-11-04'}).success).toBe(false);
  expect(executionDateFilter({from:'2026-11-04'}).date.gte.toISOString()).toBe('2026-11-04T00:00:00.000Z');
 });
 it('limita autenticação em Redis compartilhado e informa Retry-After', async () => {
  const client={eval:vi.fn().mockResolvedValue([31,40])},res=response(),next=vi.fn();
  await createAuthRateLimit({client})({ip:'127.0.0.1'},res,next);
  expect(res.statusCode).toBe(429);expect(res.headers['Retry-After']).toBe('40');expect(next).not.toHaveBeenCalled();
  expect(client.eval.mock.calls[0][2]).not.toContain('127.0.0.1');
 });
 it('permite tentativas abaixo do limite', async () => {
  const next=vi.fn();await createAuthRateLimit({client:{eval:async()=>[1,900]}})({ip:'::1'},response(),next);expect(next).toHaveBeenCalledOnce();
 });
 it('recupera aviso atrasado, ignora atividade iniciada e isola falha de outro usuário', async () => {
  const notice={key:'unique',id:7,kind:'rotinas',title:'Estudo',time:'09:00',date:'2026-11-04',startsAt:'2026-11-04T12:00:00Z',remainingMs:120000};
  const db={user:{findMany:vi.fn().mockResolvedValue([{id:1},{id:2}])},notification:{upsert:vi.fn()}},log=vi.fn();
  const upcoming=async id=>{if(id===1)throw Error('offline');return [notice,{...notice,startsAt:'2026-11-04T11:58:00Z',remainingMs:0}]};
  expect(await deliverUpcomingNotifications(new Date('2026-11-04T11:58:00Z'),undefined,{db,upcoming,log})).toEqual({users:2,failed:1});
  expect(db.notification.upsert).toHaveBeenCalledOnce();
  expect(db.notification.upsert.mock.calls[0][0]).toMatchObject({where:{dedupKey:'unique'},update:{},create:{title:'Em 2 minutos · Estudo'}});
 });
 it('percorre usuários por cursor em lotes limitados', async () => {
  const db={user:{findMany:vi.fn().mockResolvedValueOnce(Array.from({length:100},(_,i)=>({id:i+1}))).mockResolvedValueOnce([{id:101}])},notification:{upsert:vi.fn()}};
  expect((await deliverUpcomingNotifications(new Date(),undefined,{db,upcoming:async()=>[]})).users).toBe(101);
  expect(db.user.findMany.mock.calls[1][0]).toMatchObject({take:100,cursor:{id:100},skip:1});
 });
});

describe('respostas HTTP isoladas', () => {
 it('padroniza JSON inválido sem acessar serviços externos', async () => {
  const express=require('express'),request=require('supertest'),app=express();
  app.use(express.json({limit:'512kb'}));app.post('/data',(req,res)=>res.json({success:true}));app.use(errorMiddleware);
  const result=await request(app).post('/data').set('Content-Type','application/json').send('{invalid');
  expect(result.status).toBe(400);expect(result.body).toEqual({success:false,message:'JSON inválido.'});
 });
 it('retorna indisponibilidade quando o contador Redis falha', async () => {
  const log=vi.spyOn(console,'error').mockImplementation(()=>{}),res=response(),next=vi.fn();
  try {
   await createAuthRateLimit({client:{eval:async()=>{throw Error('offline')}}})({ip:'::1'},res,next);
   expect(res.statusCode).toBe(503);expect(next).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
 });
});
