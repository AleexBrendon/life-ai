const { localClock } = require('./personalPlanning.service');
const { fail } = require('./activityStatus.service');
const defaults = { enabled: false, quietEnabled: true, quietStart: '22:00', quietEnd: '07:00', upcoming: true, hydration: true, actions: false, showDetails: false };
function pushConfigured(env = process.env) { return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT); }
function isQuiet(preference, date, timezone) {
  if (!preference.quietEnabled) return false;
  const minute = localClock(date, timezone).minute;
  const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  return preference.quietStart < preference.quietEnd ? time >= preference.quietStart && time < preference.quietEnd : time >= preference.quietStart || time < preference.quietEnd;
}
function validateSubscription(input) {
  let url; try { url = new URL(input.endpoint); } catch { fail('Assinatura push inválida.', 400); }
  const host = url.hostname;
  const allowed = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' || host.endsWith('.push.services.mozilla.com') || host === 'web.push.apple.com' || host.endsWith('.notify.windows.com');
  if (!allowed || url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') fail('Provedor push não permitido.', 400);
  for (const [key, size] of [['p256dh', 65], ['auth', 16]]) {
    const value = input.keys?.[key];
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(value) || Buffer.from(value, 'base64url').length !== size) fail('Chaves da assinatura push inválidas.', 400);
  }
  return { endpoint: url.href, keys: { p256dh: input.keys.p256dh, auth: input.keys.auth } };
}
async function sendWebPush(subscription, payload, ttl) {
  const webpush = await import('web-push');
  return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: ttl, timeout: 10000, vapidDetails: { subject: process.env.VAPID_SUBJECT, publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY } });
}
function createPushDelivery(db, send = sendWebPush) {
  return async function deliver(now = new Date()) {
    if (!pushConfigured()) return;
    const started = Date.now(), clock = () => new Date(now.getTime() + Date.now() - started);
    // A bounded batch keeps a slow provider from overlapping scheduler ticks.
    const notifications = await db.notification.findMany({ where: { isRead: false, OR: [
      { type: 'UPCOMING', scheduledAt: { gt: now }, user: { pushPreference: { is: { enabled: true, upcoming: true } } } },
      { type: 'HYDRATION', createdAt: { gte: new Date(now.getTime() - 1800000) }, user: { pushPreference: { is: { enabled: true, hydration: true } } } },
      { type: 'ACTIVITY', createdAt: { gte: new Date(now.getTime() - 3600000) }, user: { pushPreference: { is: { enabled: true, actions: true } } } },
    ] }, include: { user: { include: { pushPreference: true, profile: { select: { timezone: true } }, pushSubscriptions: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    let attempted = 0;
    for (const notice of notifications) {
      const preference = notice.user.pushPreference;
      let timezone = notice.user.profile?.timezone || 'America/Sao_Paulo';
      try { localClock(now, timezone); } catch { timezone = 'America/Sao_Paulo'; }
      const channel = { UPCOMING: 'upcoming', HYDRATION: 'hydration', ACTIVITY: 'actions' }[notice.type];
      if (!preference[channel] || isQuiet(preference, now, timezone)) continue;
      const remaining = notice.type === 'UPCOMING' ? Math.floor((new Date(notice.scheduledAt).getTime() - now.getTime()) / 1000) : (notice.type === 'HYDRATION' ? 1800 : 3600) - Math.floor((now - notice.createdAt) / 1000);
      if (!Number.isFinite(remaining) || remaining <= 0) continue;
      for (const subscription of notice.user.pushSubscriptions) {
        if (attempted >= 20) return;
        try {
          const record = await db.pushDelivery.upsert({ where: { notificationId_subscriptionId: { notificationId: notice.id, subscriptionId: subscription.id } }, create: { notificationId: notice.id, subscriptionId: subscription.id }, update: {} });
          if (record.status === 'SENT') continue;
          const claimed = await db.pushDelivery.updateMany({ where: { id: record.id, status: { not: 'SENT' }, attempts: { lt: 3 }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }, data: { lockedUntil: new Date(now.getTime() + 120000), attempts: { increment: 1 } } });
          if (!claimed.count) continue;
          attempted++;
          const latest = await db.pushPreference.findUnique({ where: { userId: notice.userId } });
          const current = await db.notification.findUnique({ where: { id: notice.id }, select: { isRead: true } });
          if (!current || current.isRead || !latest?.enabled || !latest[channel] || isQuiet(latest, clock(), timezone) || remaining - (clock() - now) / 1000 <= 0) {
            await db.pushDelivery.update({ where: { id: record.id }, data: { lockedUntil: null, attempts: { decrement: 1 } } }); continue;
          }
          const payload = { title: latest.showDetails ? notice.title.slice(0, 100) : 'LifeAI', body: latest.showDetails ? notice.message.slice(0, 180) : 'Você tem uma atualização na sua agenda.', tag: 'lifeai-' + notice.id, url: '/dashboard?painel=notificacoes' };
          await send({ endpoint: subscription.endpoint, keys: subscription.keys }, payload, Math.max(1, Math.min(3600, Math.floor(remaining - (clock() - now) / 1000))));
          await db.pushDelivery.update({ where: { id: record.id }, data: { status: 'SENT', sentAt: new Date(), lockedUntil: null, errorCode: null } });
        } catch (error) {
          if ([404, 410].includes(error.statusCode)) await db.pushSubscription.deleteMany({ where: { id: subscription.id } });
          else await db.pushDelivery.updateMany({ where: { notificationId: notice.id, subscriptionId: subscription.id, status: { not: 'SENT' } }, data: { status: 'FAILED', lockedUntil: new Date(Date.now() + 300000), errorCode: String(error.statusCode || error.code || 'PROVIDER_ERROR').slice(0, 50) } });
        }
      }
    }
  };
}
function startPushDelivery(db) {
  if (!pushConfigured()) return null;
  const deliver = createPushDelivery(db); let running = false;
  const tick = async () => { if (running) return; running = true; try { await deliver(); } catch (error) { console.error('Falha na entrega push:', error.code || error.name); } finally { running = false; } };
  tick(); const timer = setInterval(tick, 30000); timer.unref(); return timer;
}
module.exports = { defaults, pushConfigured, isQuiet, validateSubscription, createPushDelivery, startPushDelivery };
