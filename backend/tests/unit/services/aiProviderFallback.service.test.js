import {it,expect,afterEach,vi} from 'vitest';
const {generateAIResponse,candidateModels}=require('../../../src/services/aiProvider.service');
const original={key:process.env.OPENROUTER_API_KEY,model:process.env.OPENROUTER_MODEL,fallbacks:process.env.OPENROUTER_FALLBACK_MODELS};
afterEach(()=>{vi.unstubAllGlobals();for(const [key,value] of Object.entries({OPENROUTER_API_KEY:original.key,OPENROUTER_MODEL:original.model,OPENROUTER_FALLBACK_MODELS:original.fallbacks}))if(value===undefined)delete process.env[key];else process.env[key]=value});
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
it('lista o modelo configurado seguido dos gratuitos de reserva, sem o roteador aleatório',()=>{
 process.env.OPENROUTER_MODEL='lento/modelo:free';delete process.env.OPENROUTER_FALLBACK_MODELS;
 expect(candidateModels()).toEqual(['lento/modelo:free','google/gemma-4-26b-a4b-it:free','xingchen-agi/xing4.0-29b-a4b:free']);
 expect(candidateModels(undefined,2)).toHaveLength(2);expect(candidateModels('fixo/modelo')).toEqual(['fixo/modelo']);
 expect(candidateModels()).not.toContain('openrouter/free');
});
it('tenta o próximo modelo quando o configurado falha ou responde vazio',async()=>{
 process.env.OPENROUTER_API_KEY='test-no-network';process.env.OPENROUTER_MODEL='lento/modelo:free';delete process.env.OPENROUTER_FALLBACK_MODELS;
 const fetch=vi.fn().mockResolvedValueOnce(reply(503,{error:{message:'ocupado'}})).mockResolvedValueOnce(reply(200,{model:'vazio',choices:[{message:{content:''}}]})).mockResolvedValueOnce(reply(200,{model:'xingchen-agi/xing4.0-29b-a4b:free',choices:[{message:{content:'ok'},finish_reason:'stop'}]}));
 vi.stubGlobal('fetch',fetch);
 const result=await generateAIResponse({messages:[{role:'user',content:'oi'}],timeoutMs:5000});
 expect(result).toMatchObject({content:'ok',model:'xingchen-agi/xing4.0-29b-a4b:free'});expect(fetch).toHaveBeenCalledTimes(3);
 expect(fetch.mock.calls.map(([,init])=>JSON.parse(init.body).model)).toEqual(['lento/modelo:free','google/gemma-4-26b-a4b-it:free','xingchen-agi/xing4.0-29b-a4b:free']);
});
it('não insiste quando a chave é recusada',async()=>{
 process.env.OPENROUTER_API_KEY='test-no-network';
 const fetch=vi.fn().mockResolvedValue(reply(401,{error:{message:'chave inválida'}}));vi.stubGlobal('fetch',fetch);
 await expect(generateAIResponse({messages:[{role:'user',content:'oi'}],timeoutMs:5000})).rejects.toMatchObject({status:401});expect(fetch).toHaveBeenCalledTimes(1);
});

it('usa o modelo principal gratuito mais capaz quando não há configuração',()=>{
 delete process.env.OPENROUTER_MODEL;delete process.env.OPENROUTER_FALLBACK_MODELS;
 expect(candidateModels()).toEqual(['nvidia/nemotron-3.5-super-vl:free','google/gemma-4-26b-a4b-it:free','xingchen-agi/xing4.0-29b-a4b:free']);
});
