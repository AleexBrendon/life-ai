import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Volume2, VolumeX, X } from 'lucide-react';
import api from '../../lib/api';
import { createPortal } from 'react-dom';
import { useNotificationFeedback } from '../../lib/NotificationFeedback';
import { hydrationAlarm } from '../planner/hydrationAlarm';

export default function HydrationAlarm() {
 const [data, setData] = useState(null), [now, setNow] = useState(new Date()), [handled, setHandled] = useState('');
 const {sound,toggleSound}=useNotificationFeedback();
 const [toastHost,setToastHost]=useState(null);
 useEffect(()=>{setToastHost(document.getElementById('lifeai-water-toast'))},[]);
 const [error, setError] = useState(''), [busy, setBusy] = useState(false), [online, setOnline] = useState(false);
 useEffect(() => {
  let active = true;
  const refresh = () => api.get('/personal/water').then(response => { if (active) { setData(response.data); setOnline(true); } }).catch(() => { if (active) setOnline(false); });
  refresh(); const poll = setInterval(refresh, 30000), tick = setInterval(() => setNow(new Date()), 1000);
  window.addEventListener('lifeai:water-updated', refresh);
  const onFocus = () => { setNow(new Date()); refresh(); };
  window.addEventListener('focus', onFocus);
  return () => { active = false; clearInterval(poll); clearInterval(tick); window.removeEventListener('lifeai:water-updated', refresh); window.removeEventListener('focus', onFocus); };
 }, []);
 const alarm = hydrationAlarm(data, now);
 const storageKey = `lifeai-water-alarm-${data?.plan.id}`;
 let previous = '';
 try { previous = localStorage.getItem(storageKey) || ''; } catch { /* private mode */ }
 const show = online && alarm.key && alarm.key !== handled && alarm.key !== previous;
 function dismiss() { setHandled(alarm.key); try { localStorage.setItem(storageKey, alarm.key); } catch { /* keep in memory */ } }
 async function drink() {
  if (busy || !data || !online) return;
  setBusy(true); setError('');
  try {
   await api.post('/personal/water/intakes', { amountMl: 250 });
   dismiss(); window.dispatchEvent(new Event('lifeai:water-updated'));
  } catch (e) { setError(e.response?.data?.message || 'Não foi possível registrar o copo. Tente novamente.'); }
  finally { setBusy(false); }
 }
 return <section className="hydration-strip" aria-label="Alarme de água">
 <Link to="/planejamento?aba=agua"><Droplets size={17}/><strong>Água</strong><span>{!data ? 'Carregando…' : !online ? 'Sem conexão' : alarm.label}</span></Link>
 {data && <span className="hydration-strip-total">{(data.totalMl / 1000).toLocaleString('pt-BR')} / {(data.plan.goalMl / 1000).toLocaleString('pt-BR')} L</span>}
 <button type="button" className="studio-button hydration-strip-drink" disabled={busy||!data||!online} onClick={drink}><Droplets size={16}/>{busy?'Registrando…':'Já bebi 250 ml'}</button>
 <button type="button" className="hydration-sound" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Desativar som das notificações' : 'Ativar som do alarme de água'}>{sound ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>{sound ? 'Som ligado' : 'Ativar som'}</span></button>
 {error && !show && <small role="alert">{error}</small>}
 {show && toastHost && createPortal(<aside className="hydration-toast" role="region" aria-label="Hora de beber água"><div className="hydration-toast-heading"><Droplets size={23}/><strong role="status">Uma pausa para beber água?</strong><button type="button" disabled={busy} onClick={dismiss} aria-label="Dispensar este lembrete de água"><X size={17}/></button></div><p>Faltam {((data.plan.goalMl - data.totalMl) / 1000).toLocaleString('pt-BR')} L para a meta que você definiu. Registre apenas o que bebeu.</p><div className="personal-actions"><button className="studio-button" disabled={busy} onClick={drink}>{busy ? 'Registrando…' : 'Já bebi 250 ml'}</button></div>{error && <p className="studio-error" role="alert">{error}</p>}</aside>,toastHost)}
 </section>;
}
