const defaults = { goalMl: 2000, cupMl: 250, intervalMinutes: 120, startTime: '08:00', endTime: '20:00', enabled: false };
const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function localClock(now, timezone = 'America/Sao_Paulo') {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
 }).formatToParts(now).map(part => [part.type, part.value]));
 return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

function hydrationSlot(plan, clock, totalMl) {
 const start = minutes(plan.startTime), end = minutes(plan.endTime);
 if (!plan.enabled || totalMl >= plan.goalMl || clock.minute < start || clock.minute > end) return null;
 return `${clock.date}:${Math.floor((clock.minute - start) / plan.intervalMinutes)}`;
}

function financeSummary(entries) {
 const sum = (kind, fn) => entries.filter(entry => entry.kind === kind).reduce((total, entry) => total + fn(entry), 0);
 const allocation = entry => entry.kind === 'PURCHASE'
  ? Math.ceil(Math.max(0, entry.amountCents - entry.savedCents) / entry.installments)
  : entry.kind === 'BOX' && entry.savedCents < entry.amountCents ? Math.min(entry.monthlyCents, entry.amountCents - entry.savedCents) : 0;
 const incomeCents = sum('INCOME', e => e.amountCents);
 const expenseCents = sum('EXPENSE', e => e.amountCents);
 const allocatedCents = entries.reduce((total, entry) => total + allocation(entry), 0);
 const availableCents = incomeCents - expenseCents;
 return { incomeCents, expenseCents, availableCents, allocatedCents, freeCents: availableCents - allocatedCents,
  entries: entries.map(entry => {
   const monthly = allocation(entry);
   const remainingCents = Math.max(0, entry.amountCents - entry.savedCents);
   const capacityCents = Math.max(0, availableCents - allocatedCents + monthly);
   return { ...entry, allocationCents: monthly, remainingCents, capacityCents,
    fits: monthly <= capacityCents,
    minimumMonths: remainingCents === 0 ? 0 : capacityCents > 0 ? Math.ceil(remainingCents / capacityCents) : null,
    plannedMonths: remainingCents === 0 ? 0 : monthly > 0 ? Math.ceil(remainingCents / monthly) : null };
  }),
 };
}

module.exports = { defaults, minutes, localClock, hydrationSlot, financeSummary };
