import {it,expect} from 'vitest';
const {requestSchema,buildBudget,strategiesFor}=require('../../../src/services/purchaseAdvisor.service');
const request=requestSchema.parse({query:'Monitor',priceCents:120000,interestRatePercent:0});
const entry=(id,kind,amountCents,title)=>({id,kind,amountCents,title,savedCents:0,monthlyCents:0,installments:1});
it('exclui freelancer e bônus não confirmados e desconta reservas e despesas',()=>{
 const budget=buildBudget({bills:[],entries:[entry(1,'INCOME',500000,'Salário'),entry(2,'INCOME',400000,'Freelancer'),entry(3,'INCOME',100000,'Bônus'),entry(4,'EXPENSE',300000,'Despesas')],today:'2026-10-21',request});
 expect(budget.months[0]).toMatchObject({incomeCents:500000,expenseCents:300000,reserveCents:50000,capacityCents:150000});
});
it('renda variável em contas entra somente no mês em que está recebida',()=>{
 const bill={id:1,kind:'INCOME',title:'Bônus',category:'Extras',monthly:true,firstDueDate:new Date('2026-10-01'),amountCents:200000,occurrences:[{referenceDate:new Date('2026-10-01'),dueDate:new Date('2026-10-01'),status:'PAID',amountCents:200000,paidAt:new Date('2026-10-01')}]};
 const budget=buildBudget({bills:[bill],entries:[],today:'2026-10-21',request});expect(budget.months[0].incomeCents).toBe(200000);expect(budget.months[1].incomeCents).toBe(0);
});
it('a marcação explícita de renda variável prevalece mesmo quando o nome parece fixo',()=>{
 const budget=buildBudget({bills:[],entries:[{...entry(1,'INCOME',500000,'Pagamento do cliente'),isVariable:true},entry(2,'INCOME',200000,'Salário')],today:'2026-10-21',request});expect(budget.months[0].incomeCents).toBe(200000);
});
it('soma despesas independentes e inclui compras e caixinhas',()=>{
 const bill={id:1,title:'Aluguel',kind:'EXPENSE',monthly:true,firstDueDate:new Date('2026-10-25'),amountCents:100000,occurrences:[]};
 const budget=buildBudget({bills:[bill],entries:[entry(1,'INCOME',500000,'Salário'),entry(2,'EXPENSE',200000,'Despesas'),{...entry(3,'BOX',1000000,'Reserva'),monthlyCents:50000}],today:'2026-10-21',request});expect(budget.months[0]).toMatchObject({expenseCents:300000,allocatedCents:50000,capacityCents:100000});
});
it('não recomenda parcelas sem taxa conhecida, nem com contas vencidas',()=>{
 const budget={months:Array.from({length:24},()=>({capacityCents:50000})),arrearsCents:0};
 expect(strategiesFor({...request,interestRatePercent:null},budget,120000).some(s=>s.id==='installments')).toBe(false);
 expect(strategiesFor(request,{...budget,arrearsCents:100},120000)).toEqual([]);
});
it('não duplica uma conta vencida do mês ao combinar contas com orçamento antigo',()=>{
 const bill={id:1,sourceEntryId:2,title:'Conta',kind:'EXPENSE',monthly:true,firstDueDate:new Date('2026-10-10'),amountCents:100000,occurrences:[]};
 const budget=buildBudget({bills:[bill],entries:[entry(1,'INCOME',500000,'Salário'),entry(2,'EXPENSE',100000,'Conta')],today:'2026-10-21',request});expect(budget.arrearsCents).toBe(100000);expect(budget.months[0].capacityCents).toBe(350000);
});
it('acrescenta bônus recebido à renda fixa antiga sem duplicar o salário entre fontes',()=>{
 const bill={id:1,title:'Bônus',kind:'INCOME',monthly:false,isVariable:true,firstDueDate:new Date('2026-10-10'),amountCents:100000,occurrences:[{referenceDate:new Date('2026-10-10'),dueDate:new Date('2026-10-10'),status:'PAID',amountCents:100000}]};
 const budget=buildBudget({bills:[bill],entries:[entry(1,'INCOME',500000,'Salário')],today:'2026-10-21',request});expect(budget.months[0].incomeCents).toBe(600000);expect(budget.months[1].incomeCents).toBe(500000);
});
it('escolhe o menor prazo compatível em todos os meses e considera juros',()=>{
 const budget={months:Array.from({length:24},()=>({capacityCents:50000})),arrearsCents:0};
 expect(strategiesFor(request,budget,120000).find(s=>s.id==='installments')).toMatchObject({installments:3,monthlyCents:40000,totalCents:120000});
 expect(strategiesFor({...request,interestRatePercent:2},budget,120000).find(s=>s.id==='installments').totalCents).toBeGreaterThan(120000);
});
it('impede entrada maior que o dinheiro declarado e não ignora déficits ao projetar poupança',()=>{
 expect(()=>requestSchema.parse({...request,availableSavingsCents:100,downPaymentCents:101})).toThrow();
 const budget={months:[{capacityCents:-10000},{capacityCents:10000},{capacityCents:10000}],arrearsCents:0};
 expect(strategiesFor({...request,interestRatePercent:null},budget,10000).find(s=>s.id==='cash')).toBeUndefined();
});
it('não sugere comprar agora se o dinheiro faltará nos meses seguintes',()=>{
 const budget={months:[{capacityCents:50000},{capacityCents:-200000}],arrearsCents:0};
 expect(strategiesFor({...request,availableSavingsCents:120000},budget,120000)).toEqual([]);
});
