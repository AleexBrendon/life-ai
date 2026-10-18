const prisma = require('../database/prisma');
const { localClock, hydrationSlot } = require('./personalPlanning.service');

async function sendHydrationReminders(now = new Date()) {
 const plans = await prisma.hydrationPlan.findMany({ where: { enabled: true }, include: { user: { select: { profile: { select: { timezone: true } } } } } });
 for (const plan of plans) {
  let clock;
  try { clock = localClock(now, plan.user.profile?.timezone); } catch { clock = localClock(now); }
  await prisma.$transaction(async tx => {
   const total = await tx.waterIntake.aggregate({ where: { userId: plan.userId, date: new Date(`${clock.date}T00:00:00Z`) }, _sum: { amountMl: true } });
   const totalMl = total._sum.amountMl || 0;
   const key = hydrationSlot(plan, clock, totalMl);
   if (!key || key === plan.lastReminderKey) return;
   // Claim this slot before creating the notification, including across API replicas.
   const claimed = await tx.hydrationPlan.updateMany({ where: { id: plan.id, enabled: true, OR: [{ lastReminderKey: null }, { lastReminderKey: { not: key } }] }, data: { lastReminderKey: key } });
   if (!claimed.count) return;
   await tx.notification.create({ data: { userId: plan.userId, title: 'Hora de beber água', message: `Você registrou ${(totalMl / 1000).toLocaleString('pt-BR')} L hoje. Faltam ${((plan.goalMl - totalMl) / 1000).toLocaleString('pt-BR')} L para sua meta. Registre o consumo em Planejamento → Água.`, type: 'HYDRATION', priority: 'LOW', entityType: 'HYDRATION', entityId: plan.id } });
  });
 }
}

function startHydrationReminders() {
 let running = false;
 const tick = async () => { if (running) return; running = true; try { await sendHydrationReminders(); } catch (error) { console.error('Falha ao verificar lembretes de água:', error.message); } finally { running = false; } };
 tick();
 const timer = setInterval(tick, 60000);
 timer.unref();
 return timer;
}
module.exports = { sendHydrationReminders, startHydrationReminders };
