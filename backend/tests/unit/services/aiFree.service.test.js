import {it,expect,afterEach,vi} from 'vitest';
const {freeModel,explain}=require('../../../src/services/aiFree.service');
const original={key:process.env.OPENROUTER_API_KEY,setup:process.env.OPENROUTER_SETUP_MODEL,model:process.env.OPENROUTER_MODEL};
afterEach(()=>{vi.unstubAllGlobals();for(const [key,value]of Object.entries({OPENROUTER_API_KEY:original.key,OPENROUTER_SETUP_MODEL:original.setup,OPENROUTER_MODEL:original.model}))if(value===undefined)delete process.env[key];else process.env[key]=value});
it('não utiliza modelos pagos nas novas análises',()=>{process.env.OPENROUTER_SETUP_MODEL='paid/model';process.env.OPENROUTER_MODEL='another/paid';expect(freeModel()).toBe('nvidia/nemotron-3.5-super-vl:free');process.env.OPENROUTER_SETUP_MODEL='provider/model:free';expect(freeModel()).toBe('provider/model:free')});
it('descarta cálculos narrados pelo modelo e conserva o cálculo autoritativo do servidor',async()=>{
 process.env.OPENROUTER_API_KEY='test-no-network';vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({model:'free',choices:[{message:{content:'A parcela é de R$ 100.'}}]}),{headers:{'Content-Type':'application/json'}})));
 expect(await explain([{role:'system',content:'Explique.'},{role:'user',content:'dados'}])).toBeNull();
});
it('sem chave usa a alternativa local sem chamar a rede',async()=>{delete process.env.OPENROUTER_API_KEY;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect(await explain([{role:'system',content:'Explique.'}])).toBeNull();expect(fetch).not.toHaveBeenCalled()});
