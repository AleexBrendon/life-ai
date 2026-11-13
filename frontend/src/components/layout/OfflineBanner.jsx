import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { queueEntries } from '../../lib/offlineStore';
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine), [count, setCount] = useState(0), [cached, setCached] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => { setOnline(navigator.onLine); queueEntries().then(rows => { if (active) setCount(rows.length); }).catch(() => {}); };
    const read = () => setCached(true);
    refresh();
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh); window.addEventListener('lifeai:offline-updated', refresh); window.addEventListener('lifeai:offline-read', read);
    return () => { active = false; window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); window.removeEventListener('lifeai:offline-updated', refresh); window.removeEventListener('lifeai:offline-read', read); };
  }, []);
  if (online && !count && !cached) return null;
  return <aside className="offline-banner" role="status"><span>{!online ? 'Sem conexão. Os dados disponíveis foram salvos neste dispositivo.' : cached ? 'Algumas informações foram carregadas do dispositivo.' : 'Há ações aguardando envio.'}{count > 0 ? ` ${count} ação(ões) pendente(s).` : ''}</span><Link to="/evolucao?aba=dados">Revisar dados e sincronização</Link></aside>;
}
