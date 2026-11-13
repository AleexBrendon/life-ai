import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { offlineEnabled, setOfflineEnabled, queueEntries, discardOperation, synchronize } from '../../lib/offlineStore';
import { serviceWorker } from '../../lib/deviceNotifications';
import { requestErrorMessage } from '../../lib/requestFeedback';
import { download } from './download';
import { localDateKey } from '../planner/calendarUtils';
import { useUserPreferences } from '../../lib/UserPreferences';

export default function DataOffline() {
  const { user } = useUserPreferences();
  const [enabled, setEnabled] = useState(offlineEnabled), [entries, setEntries] = useState([]), [online, setOnline] = useState(() => navigator.onLine);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => { setEnabled(offlineEnabled()); setOnline(navigator.onLine); queueEntries().then(rows => { if (active) setEntries(rows); }).catch(() => {}); };
    refresh(); for (const event of ['online', 'offline', 'lifeai:offline-updated']) window.addEventListener(event, refresh);
    return () => { active = false; for (const event of ['online', 'offline', 'lifeai:offline-updated']) window.removeEventListener(event, refresh); };
  }, []);
  async function run(action) { setBusy(true); setError(''); setNotice(''); try { await action(); } catch (e) { setError(e.response ? requestErrorMessage(e) : e.message); } finally { setBusy(false); } }
  async function enable() {
    await serviceWorker(); await setOfflineEnabled(true);
    const date = localDateKey(new Date(), user?.profile?.timezone);
    const paths = ['/auth/me', '/users/me', '/dashboard', ...['rotinas', 'metas', 'trabalho', 'lembretes', 'imprevistos'].map(kind => '/planner/' + kind)];
    const results = await Promise.allSettled([...paths.map(path => api.get(path, { requireOfflineCache: true })), api.get('/activity-status', { params: { date }, requireOfflineCache: true })]);
    setNotice(results.some(row => row.status === 'rejected') ? 'Modo offline ativado, mas algumas telas não puderam ser salvas. Abra-as com conexão antes de sair.' : 'Dados do dia e cadastros salvos neste dispositivo.');
  }
  return <section className="evolution-panel data-offline"><h2>Seus dados e modo offline</h2><section className="evolution-card"><h3>Exportar seus dados</h3><p>Baixe os cadastros, registros, finanças, revisões e marcos em JSON. Senhas, chaves de push e links privados de calendários ficam fora do arquivo. Guarde a exportação em um lugar seguro: ela contém seus dados pessoais.</p><button className="studio-button" disabled={busy || !online} onClick={() => run(async () => download(await api.get('/evolution/export', { timeout: 60000 }), 'lifeai-dados.json'))}>Baixar meus dados</button></section>
    <section className="evolution-card"><h3>Disponibilidade neste dispositivo</h3><p>{enabled ? 'Modo offline ativado.' : 'Modo offline desativado.'} Você escolhe armazenar os dados neste navegador. Evite ativar em dispositivos compartilhados. Os dados locais são apagados ao sair da conta.</p><p>Offline, consulte as telas já salvas e conclua, pule ou retome atividades dos dias disponíveis. Finanças, exclusões, importações e decisões da IA exigem conexão. A sessão deve continuar válida; não é possível entrar pela primeira vez offline.</p><div className="evolution-actions"><button className="studio-button" disabled={busy || !online} onClick={() => run(enable)}>{enabled ? 'Atualizar dados deste dispositivo' : 'Ativar e salvar dados offline'}</button><button className="studio-button secondary" disabled={busy || !enabled} onClick={() => { if (!entries.length || window.confirm(`Apagar os dados locais e ${entries.length} ação(ões) ainda não sincronizada(s)?`)) run(async () => setOfflineEnabled(false)); }}>Desativar e apagar dados locais</button></div></section>
    <section className="evolution-card"><h3>Pendências de sincronização · {entries.length}</h3><p>O envio ocorre quando você solicita, após confirmar sua sessão com o servidor. Se a atividade mudou em outro dispositivo, ela fica em conflito e não é sobrescrita. Revise a agenda online e descarte a ação local que não deseja manter.</p><button className="studio-button" disabled={busy || !online || !entries.some(row => row.state === 'PENDING')} onClick={() => run(async () => { const results = await synchronize(api); setNotice(`${results.filter(row => row.status === 'APPLIED').length} ação(ões) enviada(s). As demais permanecem para revisão.`); })}>{busy ? 'Enviando…' : 'Sincronizar pendências'}</button><ul className="evolution-queue">{entries.map(row => <li key={row.id}><span><strong>{row.input.date.split('-').reverse().join('/')} · {row.input.kind}</strong><small>{row.input.status === 'COMPLETED' ? 'Concluir' : row.input.status === 'SKIPPED' ? 'Pular' : 'Retomar'} · {row.state === 'CONFLICT' ? 'Conflito — revisar online' : 'Aguardando envio'}{row.message ? ` · ${row.message}` : ''}</small></span><button className="studio-button secondary" disabled={busy} onClick={() => run(() => discardOperation(row.sequence))}>Descartar ação local</button></li>)}</ul></section>
    {error && <p role="alert" className="studio-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>;
}
