import {it,expect} from 'vitest';
const {simulate,arrearsFor,inputSchema}=require('../../../src/services/debtPurchase.service');
const entry=(id,kind,amountCents,extra={})=>({id,kind,title:'Registro '+id,amountCents,savedCents:0,monthlyCents:0,installments:1,...extra});
const bill=(id,amountCents,extra={})=>({id,title:'Conta '+id,kind:'EXPENSE',category:'Outros',amountCents,firstDueDate:new Date('2026-09-10'),monthly:false,recurrence:'ONCE',occurrences:[],...extra});
const request=inputSchema.parse({purchaseIds:[3]});
const context={today:'2026-10-21',bills:[bill(1,100000)],entries:[entry(1,'INCOME',300000),entry(2,'EXPENSE',200000),entry(3,'PURCHASE',120000)]};
it('prioriza dívidas, inclui a compra e oferece duas opções sem comprometer a reserva',()=>{
 const result=simulate(context,request);expect(result.debtCents).toBe(100000);expect(result.purchaseCents).toBe(120000);expect(result.options).toHaveLength(2);
 expect(result.months[0]).toMatchObject({reserveCents:30000,capacityCents:70000});
 for(const plan of result.options){expect(plan.schedule.reduce((sum,row)=>sum+row.debtPaymentCents,0)).toBe(100000);expect(plan.schedule.reduce((sum,row)=>sum+row.purchasePaymentCents,0)).toBe(120000);expect(plan.schedule.every(row=>!row.purchasePaymentCents||row.remainingDebtCents===0)).toBe(true);expect(plan.schedule.every(row=>row.purchaseFundCents>=0)).toBe(true)}
 expect(result.options[1].buyMonth>=result.options[0].buyMonth).toBe(true);
});
it('não duplica dívida vencida neste mês, nem orçamento explicitamente vinculado',()=>{
 const debt=bill(2,100000,{firstDueDate:new Date('2026-10-10'),sourceEntryId:2});
 const result=simulate({...context,bills:[debt]},request);
 expect(result.debtCents).toBe(100000);expect(result.months[0].expenseCents).toBe(0);
 expect(result.months[0].capacityCents).toBe(270000);expect(result.options[0].schedule[0].debtPaymentCents).toBe(100000);
});
it('conta todos os atrasos uma vez, exclui pagos e respeita datas futuras',()=>{
 const recurring=bill(1,10000,{monthly:true,recurrence:'MONTHLY',firstDueDate:new Date('2026-08-10'),occurrences:[{referenceDate:new Date('2026-08-10'),dueDate:new Date('2026-09-12'),amountCents:9000,status:'POSTPONED'},{referenceDate:new Date('2026-09-10'),dueDate:new Date('2026-09-10'),amountCents:10000,status:'PAID'}]});
 expect(arrearsFor([recurring,bill(2,5000,{firstDueDate:new Date('2026-11-05')})],context.today).map(row=>row.amountCents)).toEqual([9000,10000]);
});
it('inclui várias compras sem duplicar suas parcelas e mantém as outras caixinhas',()=>{
 const result=simulate({...context,entries:[...context.entries,entry(4,'PURCHASE',40000,{savedCents:10000}),entry(5,'BOX',1000000,{monthlyCents:10000})]},{...request,purchaseIds:[3,4]});
 expect(result.purchaseCents).toBe(150000);expect(result.months[0].allocatedCents).toBe(10000);
});
it('não oferece compra quando o orçamento não comporta ou depende de renda incerta',()=>{
 expect(simulate({...context,entries:[entry(1,'INCOME',300000,{isVariable:true}),entry(3,'PURCHASE',120000)]},request).options).toEqual([]);
 expect(simulate({...context,entries:[entry(1,'INCOME',100000),entry(2,'EXPENSE',200000),entry(3,'PURCHASE',120000)]},request).options).toEqual([]);
});
it('não usa o saldo separado duas vezes nem aceita compra alheia',()=>{
 const result=simulate(context,{...request,availableSavingsCents:120000});
 expect(result.options[0].schedule[0].purchasePaymentCents).toBe(0);
 expect(()=>simulate(context,{...request,purchaseIds:[99]})).toThrow('não foi encontrada');
});
