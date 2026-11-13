export async function serviceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) throw new Error('Este navegador precisa de HTTPS e suporte a service worker.');
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}
export async function enablePush(api, publicKey) {
  if (!('PushManager' in window) || !('Notification' in window)) throw new Error('Push não está disponível neste navegador. No iPhone, instale o aplicativo na tela inicial.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('A permissão não foi concedida. Você pode alterá-la nas configurações do navegador.');
  const registration = await serviceWorker();
  const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), letter => letter.charCodeAt(0));
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  try { await api.post('/evolution/push/subscriptions', subscription.toJSON()); }
  catch (error) { await subscription.unsubscribe(); throw error; }
}
export async function disablePush(api) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  try { if (api && navigator.onLine) await api.delete('/evolution/push/subscriptions', { data: { endpoint: subscription.endpoint } }); }
  finally { await subscription.unsubscribe(); }
}
