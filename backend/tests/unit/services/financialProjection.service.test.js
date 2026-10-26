import {it,expect} from 'vitest';
const {projectMonths}=require('../../../src/services/financialProjection.service');
const entry=(id,kind,amountCents,extra={})=>({id,kind,title:'Item '+id,amountCents,savedCents:0,installments:1,...extra});
const bill=(id,kind,firstDueDate,extra={})=>({id,kind,title:'Conta '+id,firstDueDate:new Date(firstDueDate),amountCents:10000,recurrence:'MONTHLY',occurrences:[],...extra});
it('respeita primeiro vencimento e trimestre sem repetir orçamento vinculado',()=>{
 const months=projectMonths({today:'2026-10-25',entries:[entry(1,'EXPENSE',10000)],bills:[bill(1,'EXPENSE','2026-11-05',{sourceEntryId:1,recurrence:'QUARTERLY'})]});
 expect(months.slice(0,5).map(m=>m.expenseCents)).toEqual([0,10000,0,0,10000]);
});
it('não escolhe apenas a maior renda: soma fontes independentes e exclui vínculo',()=>{
 const months=projectMonths({today:'2026-10-25',entries:[entry(1,'INCOME',500000),entry(2,'INCOME',100000)],bills:[bill(1,'INCOME','2026-10-05',{sourceEntryId:1,amountCents:500000}),bill(2,'INCOME','2026-10-05',{amountCents:200000})]});
 expect(months[0].incomeCents).toBe(800000);
});
it('atribui renda variável ao pagamento real, sem antecipar recebimentos futuros',()=>{
 const paid=bill(1,'INCOME','2026-09-10',{isVariable:true,occurrences:[{referenceDate:new Date('2026-09-10'),dueDate:new Date('2026-09-10'),paidAt:new Date('2026-10-20'),status:'PAID',amountCents:20000},{referenceDate:new Date('2026-10-10'),dueDate:new Date('2026-10-10'),paidAt:new Date('2026-11-01'),status:'PAID',amountCents:30000}]});
 const months=projectMonths({today:'2026-10-25',entries:[],bills:[paid]});
 expect(months[0].incomeCents).toBe(20000);expect(months[1].incomeCents).toBe(0);
});
it('libera compras e caixinhas ao completar o valor restante',()=>{
 const months=projectMonths({today:'2026-10-25',bills:[],entries:[entry(1,'PURCHASE',20000,{installments:2}),entry(2,'BOX',15000,{monthlyCents:10000})]});
 expect(months.slice(0,4).map(m=>m.allocatedCents)).toEqual([20000,15000,0,0]);
});
