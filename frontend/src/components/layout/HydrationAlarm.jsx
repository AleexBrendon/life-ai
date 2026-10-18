import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Volume2, VolumeX, X } from 'lucide-react';
import api from '../../lib/api';
import { hydrationAlarm } from '../planner/hydrationAlarm';

export default function HydrationAlarm() {
 const [data, setData] = useState(null), [now, setNow] = useState(new Date()), [handled, setHandled] = useState('');
 const [sound, setSound] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [online, setOnline] = useState(false);
 const audio = useRef(null), sounded = useRef('');
 useEffect(() => {
  let active = true;
  const refresh = () => api.get('/personal/water').then(response => { if (active) { setData(response.data); setOnline(true); } }).catch(() => { if (active) setOnline(false); });
  refresh(); const poll = setInterval(refresh, 30000), tick = setInterval(() => setNow(new Date()), 1000);
  window.addEventListener('lifeai:water-updated', refresh);
  const onFocus = () => { setNow(new Date()); refresh(); };
  window.addEventListener('focus', onFocus);
  return () => { active = false; clearInterval(poll); clearInterval(tick); window.removeEventListener('lifeai:water-updated', refresh); window.removeEventListener('focus', onFocus); };
 }, []);
 useEffect(() => () => { audio.current?.close().catch(() => {}); }, []);
 const alarm = hydrationAlarm(data, now);
 const storageKey = `lifeai-water-alarm-${data?.plan.id}`;
 let previous = '';
 try { previous = localStorage.getItem(storageKey) || ''; } catch { /* private mode */ }
 const show = online && alarm.key && alarm.key !== handled && alarm.key !== previous;
 function beep() {
  const context = audio.current;
  if (!context || context.state !== 'running') return;
  const oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0, context.currentTime); gain.gain.linearRampToValueAtTime(.08, context.currentTime + .03); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .5);
  oscillator.start(); oscillator.stop(context.currentTime + .5);
 }
 useEffect(() => { if (show && sound && sounded.current !== alarm.key) { sounded.current = alarm.key; beep(); } }, [show, sound, alarm.key]);
 async function toggleSound() {
  if (sound) { setSound(false); return; }
  try { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) throw new Error(); audio.current ||= new Audio(); await audio.current.resume(); beep(); setSound(true); setError(''); }
  catch { setError('O navegador não liberou o som. O aviso visual continua disponível.'); }
 }
 function dismiss() { setHandled(alarm.key); try { localStorage.setItem(storageKey, alarm.key); } catch { /* keep in memory */ } }
 async function drink() {
  setBusy(true); setError('');
  try {
   await api.post('/personal/water/intakes', { amountMl: data.plan.cupMl });
   dismiss(); window.dispatchEvent(new Event('lifeai:water-updated'));
  } catch (e) { setError(e.response?.data?.message || 'Não foi possível registrar o copo. Tente novamente.'); }
  finally { setBusy(false); }
 }
 return <section className="hydration-strip" aria-label="Alarme de água">
 <Link to="/planejamento?aba=agua"><Droplets size={17}/><strong>Água</strong><span>{!data ? 'Carregando…' : !online ? 'Sem conexão' : alarm.label}</span></Link>
 {data && <span className="hydration-strip-total">{(data.totalMl / 1000).toLocaleString('pt-BR')} / {(data.plan.goalMl / 1000).toLocaleString('pt-BR')} L</span>}
 <button type="button" className="hydration-sound" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Desativar som do alarme de água' : 'Ativar som do alarme de água'}>{sound ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>{sound ? 'Som ligado' : 'Ativar som'}</span></button>
 {error && !show && <small role="alert">{error}</small>}
 {show && <aside className="hydration-toast" role="region" aria-label="Hora de beber água"><div className="hydration-toast-heading"><Droplets size={23}/><strong role="status">Uma pausa para beber água?</strong><button type="button" disabled={busy} onClick={dismiss} aria-label="Dispensar este lembrete de água"><X size={17}/></button></div><p>Faltam {((data.plan.goalMl - data.totalMl) / 1000).toLocaleString('pt-BR')} L para a meta que você definiu. Registre apenas o que bebeu.</p><div className="personal-actions"><button className="studio-button" disabled={busy} onClick={drink}>{busy ? 'Registrando…' : `Bebi ${data.plan.cupMl} ml`}</button><Link className="studio-button secondary" to="/planejamento?aba=agua" onClick={dismiss}>Outro volume</Link><button className="hydration-dismiss" disabled={busy} onClick={dismiss}>Agora não</button></div>{error && <p className="studio-error" role="alert">{error}</p>}</aside>}
 </section>;
}
