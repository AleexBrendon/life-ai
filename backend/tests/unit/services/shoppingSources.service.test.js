import {it,expect} from 'vitest';
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
