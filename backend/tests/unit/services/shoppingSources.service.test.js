import {it,expect,vi} from 'vitest';
const {allowedProductUrl,extractProduct}=require('../../../src/services/shoppingSources.service');
it('aceita somente HTTPS de lojas explícitas e recusa URLs internas, credenciais e domínios parecidos',()=>{
 expect(allowedProductUrl('https://www.kabum.com.br/produto/123/monitor')).toBe(true);
 for(const value of ['http://127.0.0.1/','https://www.kabum.com.br.evil.test/produto/1','https://user:pass@www.kabum.com.br/','https://www.kabum.com.br:8080/','file:///etc/passwd'])expect(allowedProductUrl(value)).toBe(false);
});
it('extrai preço e avaliações publicados sem inventar vendas ou vendedor oficial',()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Monitor',offers:{price:'1299.90',priceCurrency:'BRL',availability:'https://schema.org/InStock'},aggregateRating:{ratingValue:4.8,reviewCount:321}})+'</script>';
 expect(extractProduct(html,'https://www.kabum.com.br/produto/123')).toMatchObject({priceCents:129990,rating:4.8,reviewCount:321,salesCount:null,officialSellerConfirmed:false});
});
it('não converte moeda estrangeira em reais nem cria produto de uma página sem evidências',()=>{
 expect(extractProduct('<html>Oferta imperdível</html>','https://www.pichau.com.br/monitor')).toBeNull();
 const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Produto',offers:{price:100,priceCurrency:'USD'}})+'</script>';
 expect(extractProduct(html,'https://www.aliexpress.com/item/123.html').priceCents).toBeNull();
});

it('redirecionamentos compartilham o mesmo prazo e preservam outra oferta válida',async()=>{
 const {searchProducts}=require('../../../src/services/shoppingSources.service');
 const signals=[];
 const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Monitor',offers:{price:100,priceCurrency:'BRL'}})+'</script>';
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  signals.push(options.signal);
  if(url.endsWith('/redirect-test'))return new Response(null,{status:302,headers:{location:'https://www.kabum.com.br/produto/final-test'}});
  return new Response(html);
 }));
 try{
  const result=await searchProducts({query:'deadline-test',urls:['https://www.kabum.com.br/redirect-test']});
  expect(result.offers).toHaveLength(1);
  expect(signals).toHaveLength(2);
  expect(signals[0]).toBe(signals[1]);
  expect(signals[0]).toBeInstanceOf(AbortSignal);
 }finally{vi.unstubAllGlobals();}
});

it('interrompe consultas no prazo global sem guardar falha temporária no cache',async()=>{
 const {searchProducts}=require('../../../src/services/shoppingSources.service');
 const original=AbortSignal.timeout.bind(AbortSignal);
 const timeout=vi.spyOn(AbortSignal,'timeout').mockImplementation(ms=>ms===18000?AbortSignal.abort():original(ms));
 const fetchMock=vi.fn(async(url,{signal})=>{signal.throwIfAborted();return new Response('');});
 vi.stubGlobal('fetch',fetchMock);
 try{
  const args={query:'expired-deadline-test',urls:['https://www.kabum.com.br/produto/expired-deadline-test']};
  const result=await searchProducts(args);
  expect(result.offers).toEqual([]);
  expect(result.warnings.join(' ')).toContain('limite de tempo');
  await searchProducts(args);
  expect(fetchMock).toHaveBeenCalledTimes(2);
 }finally{timeout.mockRestore();vi.unstubAllGlobals();}
});
