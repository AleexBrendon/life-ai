const stores=[
 {id:'mercadolivre',name:'Mercado Livre',hosts:['www.mercadolivre.com.br','mercadolivre.com.br','produto.mercadolivre.com.br'],marketplace:true,search:q=>'https://lista.mercadolivre.com.br/'+encodeURIComponent(q.replace(/\s+/g,'-'))},
 {id:'aliexpress',name:'AliExpress',hosts:['www.aliexpress.com','pt.aliexpress.com','aliexpress.com'],marketplace:true,search:q=>'https://www.aliexpress.com/w/wholesale-'+encodeURIComponent(q.replace(/\s+/g,'-'))+'.html'},
 {id:'terabyte',name:'Terabyte',hosts:['www.terabyteshop.com.br','terabyteshop.com.br'],search:q=>'https://www.terabyteshop.com.br/busca?str='+encodeURIComponent(q)},
 {id:'kabum',name:'KaBuM!',hosts:['www.kabum.com.br','kabum.com.br'],marketplace:true,search:q=>'https://www.kabum.com.br/busca/'+encodeURIComponent(q.replace(/\s+/g,'-'))},
 {id:'pichau',name:'Pichau',hosts:['www.pichau.com.br','pichau.com.br'],search:q=>'https://www.pichau.com.br/search?q='+encodeURIComponent(q)},
 {id:'amazon',name:'Amazon Brasil',hosts:['www.amazon.com.br','amazon.com.br'],marketplace:true,search:q=>'https://www.amazon.com.br/s?k='+encodeURIComponent(q)},
];
function allowedProductUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&stores.some(s=>s.hosts.includes(url.hostname.toLowerCase()))&&!/\.(?:exe|zip|pdf)(?:$|\?)/i.test(url.pathname)}catch{return false}}
const decode=text=>String(text).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff)));
async function readPublic(url,{search=false}={}){
 if(!search&&!allowedProductUrl(url))throw Error('UNSUPPORTED_STORE');
 for(let redirect=0;redirect<3;redirect++){
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(6000),headers:{'User-Agent':'LifeAI/1.0 (public product metadata; no automated purchases)','Accept':'text/html,application/rss+xml,application/xml;q=0.8'}});
  if(response.status>=300&&response.status<400){const next=new URL(response.headers.get('location')||'',url);if(search?!['www.bing.com','html.duckduckgo.com'].includes(next.hostname):!allowedProductUrl(next.href))throw Error('UNSUPPORTED_REDIRECT');url=next.href;continue;}
  if(!response.ok)throw Error('STORE_UNAVAILABLE');
  const reader=response.body.getReader();let text='',bytes=0;const decoder=new TextDecoder();
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2000000)throw Error('PAGE_TOO_LARGE');text+=decoder.decode(value,{stream:true})}return {text,url}}finally{await reader.cancel().catch(()=>{})}
 }
 throw Error('TOO_MANY_REDIRECTS');
}
function productsFromJsonLd(html){
 const nodes=[];
 const collect=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(collect);return}if([value['@type']].flat().some(t=>/^(?:https?:\/\/schema.org\/)?Product$/.test(t)))nodes.push(value);if(value['@graph'])collect(value['@graph']);if(value.mainEntity)collect(value.mainEntity)};
 for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{collect(JSON.parse(match[1]))}catch{}}
 return nodes;
}
function extractProduct(html,url){
 if(!allowedProductUrl(url))return null;
 const store=stores.find(s=>s.hosts.includes(new URL(url).hostname)),products=productsFromJsonLd(html);
 const product=products.find(p=>p.url===url&&typeof p.name==='string')||(products.length===1?products[0]:null);if(!product)return null;
 const offers=[product.offers].flat().filter(Boolean);const offer=offers.find(o=>o.priceCurrency==='BRL'&&Number(o.price)>0)||offers[0]||{};
 const price=offer.priceCurrency==='BRL'&&Number.isFinite(Number(offer.price))&&Number(offer.price)>0?Math.round(Number(offer.price)*100):null;
 const rating=product.aggregateRating||{},count=Number(rating.reviewCount??rating.ratingCount),ratingValue=Number(rating.ratingValue),best=Number(rating.bestRating||5);
 const interactions=[product.interactionStatistic].flat().filter(Boolean);const purchases=interactions.find(i=>/BuyAction|Purchase/.test(typeof i.interactionType==='string'?i.interactionType:i.interactionType?.['@type']||''));
 const sales=Number(purchases?.userInteractionCount);
 return {id:require('crypto').createHash('sha256').update(url).digest('hex').slice(0,16),title:decode(product.name).slice(0,200),url,store:store.name,storeId:store.id,marketplace:!!store.marketplace,
  priceCents:price&&price<=100000000?price:null,currency:offer.priceCurrency||null,rating:Number.isFinite(ratingValue)&&ratingValue>0&&best>0?Math.round(ratingValue/best*500)/100:null,
  reviewCount:Number.isSafeInteger(count)&&count>=0?count:null,salesCount:Number.isSafeInteger(sales)&&sales>=0?sales:null,
  seller:typeof offer.seller?.name==='string'?offer.seller.name.slice(0,150):null,
  available:typeof offer.availability==='string'?/InStock|LimitedAvailability/.test(offer.availability):null,
  checkedAt:new Date().toISOString(),evidence:'Metadados estruturados publicados na página do produto.',officialSellerConfirmed:false};
}
const cache=new Map();
async function searchProducts({query,urls=[],minReviews=100,minRating=4.5,minSales=100}){
 const cacheKey=JSON.stringify({query,urls});let result=cache.get(cacheKey);
 if(!result||Date.now()-result.timestamp>300000){
  const candidates=new Set(urls.filter(allowedProductUrl)),warnings=[];
  if(!urls.length){
   const q=query+' ('+stores.slice(0,5).map(s=>'site:'+s.hosts[0]).join(' OR ')+')';
   try{const {text}=await readPublic('https://www.bing.com/search?format=rss&q='+encodeURIComponent(q),{search:true});for(const match of text.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){const link=match[1].match(/<link>([\s\S]*?)<\/link>/i)?.[1];if(link&&allowedProductUrl(decode(link)))candidates.add(decode(link));if(candidates.size>=6)break}}catch{}
   if(!candidates.size)try{const {text}=await readPublic('https://html.duckduckgo.com/html/?q='+encodeURIComponent(q),{search:true});for(const match of text.matchAll(/href\s*=\s*["']([^"']+)["']/gi)){let link=decode(match[1]);try{const parsed=new URL(link,'https://html.duckduckgo.com');if(['duckduckgo.com','html.duckduckgo.com'].includes(parsed.hostname)&&parsed.searchParams.has('uddg'))link=parsed.searchParams.get('uddg')}catch{}if(allowedProductUrl(link))candidates.add(link);if(candidates.size>=6)break}}catch{}
   if(!candidates.size)warnings.push('A busca pública não retornou anúncios verificáveis. Use os links de busca das lojas ou cole links de produtos para verificação.');
  }
  const offers=[];for(let offset=0;offset<Math.min(6,candidates.size);offset+=2){const batch=[...candidates].slice(offset,offset+2);await Promise.all(batch.map(async url=>{try{const page=await readPublic(url);const product=extractProduct(page.text,page.url);if(product)offers.push(product);else warnings.push('Uma loja não publicou dados estruturados suficientes para verificar o anúncio.')}catch{warnings.push('Uma página bloqueou ou não permitiu a consulta automática.')} }));}
  if(cache.size>=40)cache.delete(cache.keys().next().value);result={timestamp:Date.now(),offers,warnings:[...new Set(warnings)]};cache.set(cacheKey,result);
 }
 const offers=result.offers.map(offer=>({...offer,meetsReviewCriteria:offer.rating!==null&&offer.reviewCount!==null&&offer.rating>=minRating&&offer.reviewCount>=minReviews,meetsSalesCriteria:offer.salesCount!==null&&offer.salesCount>=minSales})).sort((a,b)=>Number(b.meetsReviewCriteria&&b.meetsSalesCriteria)-Number(a.meetsReviewCriteria&&a.meetsSalesCriteria)||(a.priceCents??Infinity)-(b.priceCents??Infinity));
 return {offers,warnings:result.warnings,checkedAt:new Date(result.timestamp).toISOString(),stores:stores.map(({id,name,search})=>({id,name,url:search(query)})),criteria:{minReviews,minRating,minSales},note:'Domínio da loja não confirma vendedor oficial de um marketplace. Avaliações e vendas só aparecem quando publicadas e verificáveis; frete, impostos e parcelamento devem ser conferidos no checkout.'};
}
module.exports={stores,allowedProductUrl,productsFromJsonLd,extractProduct,searchProducts};
