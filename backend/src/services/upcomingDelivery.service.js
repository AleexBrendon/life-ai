// Recover missed ticks while the activity is still in the five-minute window.
// Unique dedupKey keeps retries and multiple API replicas idempotent.
async function deliverUpcomingNotifications(now, onlyUserId, { db, upcoming, log = console.error, clock = () => now }) {
 let cursor;
 const result = { users: 0, failed: 0 };
 do {
  const users = await db.user.findMany({
   where: { ...(onlyUserId ? { id: onlyUserId } : {}), OR: [{ profile: { is: null } }, { profile: { is: { notifyUpcoming: true } } }] },
   select: { id: true, profile: { select: { timezone: true, notifyUpcoming: true } } },
   orderBy: { id: 'asc' }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  if (!users.length) break;
  for (const user of users) {
   result.users++;
   try {
    const items = await upcoming(user.id, clock(), user.profile);
    for (const item of items) {
     // Ignore started activities and anything outside the recovery window.
     const remaining = new Date(item.startsAt).getTime() - clock().getTime();
     if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 300000) continue;
     const minutesLeft = Math.ceil(remaining / 60000);
     await db.notification.upsert({ where: { dedupKey: item.key }, update: {}, create: {
      userId: user.id, dedupKey: item.key, type: 'UPCOMING', priority: 'HIGH',
      title: 'Em ' + minutesLeft + (minutesLeft === 1 ? ' minuto · ' : ' minutos · ') + item.title.slice(0, 100),
      message: item.title.slice(0, 150) + ' começa às ' + item.time + ' em ' + item.date.split('-').reverse().join('/') + '. Abra a atividade para acompanhar na agenda.',
      entityType: item.kind, entityId: item.id, scheduledAt: new Date(item.startsAt),
     } });
    }
   } catch (error) {
    result.failed++;
    log('Falha nos avisos do usuário:', { userId: user.id, code: error.code || error.name });
   }
  }
  cursor = users[users.length - 1].id;
  if (onlyUserId || users.length < 100) break;
 } while (true);
 return result;
}
module.exports = { deliverUpcomingNotifications };
