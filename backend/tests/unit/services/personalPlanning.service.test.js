import { describe, it, expect } from 'vitest';
const { defaults, localClock, hydrationSlot, financeSummary } = require('../../../src/services/personalPlanning.service');
const entry = (kind, amountCents, extra = {}) => ({ kind, amountCents, savedCents: 0, monthlyCents: 0, installments: 1, ...extra });

describe('Planejamento financeiro mensal', () => {
 it('reserva parcelas e caixinhas uma única vez e calcula o prazo disponível', () => {
  const result = financeSummary([entry('INCOME', 500000), entry('EXPENSE', 300000), entry('BOX', 1000000, { monthlyCents: 50000 }), entry('PURCHASE', 300000, { installments: 3 })]);
  expect(result).toMatchObject({ incomeCents: 500000, expenseCents: 300000, allocatedCents: 150000, freeCents: 50000 });
  expect(result.entries[3]).toMatchObject({ minimumMonths: 2, allocationCents: 100000, capacityCents: 150000, fits: true });
 });
 it('considera outras compras, entrada e saldo negativo sem prometer prazo impossível', () => {
  const result = financeSummary([entry('INCOME', 100000), entry('EXPENSE', 90000), entry('PURCHASE', 100000, { savedCents: 10000, installments: 3 }), entry('BOX', 500000, { monthlyCents: 20000 })]);
  expect(result.freeCents).toBe(-40000);
  expect(result.entries[2]).toMatchObject({ remainingCents: 90000, allocationCents: 30000, minimumMonths: null, fits: false });
 });
 it('libera a reserva ao atingir o objetivo e limita o último aporte à diferença', () => {
  const result = financeSummary([entry('BOX', 100000, { savedCents: 99000, monthlyCents: 5000 }), entry('PURCHASE', 100000, { savedCents: 100000, installments: 3 })]);
  expect(result.allocatedCents).toBe(1000);
  expect(result.entries[1]).toMatchObject({ allocationCents: 0, remainingCents: 0, minimumMonths: 0 });
 });
 it('arredonda parcelas para cima em centavos e aceita orçamento vazio', () => {
  expect(financeSummary([entry('PURCHASE', 10000, { installments: 3 })]).entries[0].allocationCents).toBe(3334);
  expect(financeSummary([])).toMatchObject({ freeCents: 0, allocatedCents: 0, entries: [] });
 });
});
describe('Meta de água e lembretes', () => {
 it('usa o dia do perfil, inclusive próximo à meia-noite UTC', () => {
  expect(localClock(new Date('2026-10-18T01:30:00Z'))).toEqual({ date: '2026-10-17', minute: 1350 });
 });
 it('só gera uma chave por intervalo, dentro da janela e antes de atingir a meta', () => {
  const plan = { ...defaults, enabled: true };
  const clock = minute => ({ date: '2026-10-17', minute });
  expect(hydrationSlot(plan, clock(479), 0)).toBeNull();
  expect(hydrationSlot(plan, clock(480), 0)).toBe('2026-10-17:0');
  expect(hydrationSlot(plan, clock(599), 0)).toBe('2026-10-17:0');
  expect(hydrationSlot(plan, clock(600), 0)).toBe('2026-10-17:1');
  expect(hydrationSlot(plan, clock(1201), 0)).toBeNull();
  expect(hydrationSlot(plan, clock(600), 2000)).toBeNull();
  expect(hydrationSlot({ ...plan, enabled: false }, clock(600), 0)).toBeNull();
 });
});
