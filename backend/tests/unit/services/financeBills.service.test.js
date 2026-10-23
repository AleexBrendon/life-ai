import {it,expect} from 'vitest';
const {dueInMonth,monthRows,summarize,validDate}=require('../../../src/services/financeBills.service');
const bill={id:1,title:'Internet',kind:'EXPENSE',category:'Casa',amountCents:10000,firstDueDate:new Date('2026-01-31T00:00:00Z'),monthly:true,occurrences:[]};
it('ajusta dias 29 a 31 sem perder o dia original nos meses seguintes',()=>{
 expect(dueInMonth(bill,'2026-02')).toBe('2026-02-28');expect(dueInMonth(bill,'2026-03')).toBe('2026-03-31');
 expect(dueInMonth({...bill,firstDueDate:new Date('2028-01-31')},'2028-02')).toBe('2028-02-29');
 expect(dueInMonth(bill,'2025-12')).toBeNull();expect(dueInMonth({...bill,endDate:new Date('2026-02-28')},'2026-03')).toBeNull();
});
it('projeta uma única vez contas avulsas e rejeita datas inexistentes',()=>{
 expect(dueInMonth({...bill,monthly:false},'2026-02')).toBeNull();
 expect(validDate('2026-02-30')).toBe(false);expect(validDate('2028-02-29')).toBe(true);
});
it('leva um adiamento para o mês novo e mantém o histórico no mês original sem somar duas vezes',()=>{
 const modified={...bill,occurrences:[{id:1,referenceDate:new Date('2026-01-31'),dueDate:new Date('2026-02-10'),status:'POSTPONED',amountCents:9000,reason:'Salário',history:[]}]};
 const january=monthRows([modified],'2026-01','2026-02-11'),february=monthRows([modified],'2026-02','2026-02-11');
 expect(january[0].status).toBe('UNPAID');expect(january[0].reason).toBe('Salário');expect(summarize(january,'2026-01').expenseCents).toBe(0);
 expect(february).toHaveLength(2);expect(summarize(february,'2026-02')).toMatchObject({expenseCents:19000,overdueCents:9000});
});
it('pagamentos preservam valor registrado e não ficam vencidos',()=>{
 const paid={...bill,amountCents:15000,occurrences:[{referenceDate:new Date('2026-01-31'),dueDate:new Date('2026-01-31'),status:'PAID',amountCents:10000,paidAt:new Date('2026-02-03')}]};
 const rows=monthRows([paid],'2026-01','2026-03-01');expect(rows[0]).toMatchObject({status:'PAID',amountCents:10000,overdue:false,paidAt:'2026-02-03'});
 expect(summarize(rows,'2026-01')).toMatchObject({paidCents:10000,pendingCents:0,cashCents:-10000});
});

it('projeta semanas e intervalos de 14 dias a partir do primeiro vencimento',()=>{
 const weekly={...bill,monthly:false,recurrence:'WEEKLY',firstDueDate:new Date('2026-01-30')};
 expect(monthRows([weekly],'2026-02','2026-01-01').map(r=>r.referenceDate)).toEqual(['2026-02-06','2026-02-13','2026-02-20','2026-02-27']);
 expect(monthRows([{...weekly,recurrence:'FORTNIGHTLY',endDate:new Date('2026-02-20')}],'2026-02','2026-01-01').map(r=>r.referenceDate)).toEqual(['2026-02-13']);
});
it('respeita intervalos mensais e anos bissextos sem antecipar vencimentos',()=>{
 expect(dueInMonth({...bill,recurrence:'QUARTERLY'},'2026-02')).toBeNull();
 expect(dueInMonth({...bill,recurrence:'QUARTERLY'},'2026-04')).toBe('2026-04-30');
 expect(dueInMonth({...bill,recurrence:'YEARLY',firstDueDate:new Date('2024-02-29')},'2025-02')).toBe('2025-02-28');
});
