import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, X, ArrowUpRight, Volume2, VolumeX } from 'lucide-react';
import { useNotificationFeedback } from '../../lib/NotificationFeedback';
import { useUserPreferences } from '../../lib/UserPreferences';
import { countdown } from './upcomingCountdown';

const names={rotinas:'Rotina',lembretes:'Lembrete',trabalho:'Trabalho',metas:'Meta',imprevistos:'Imprevisto'};
export default function NotificationToasts(){
 const {upcoming,sound,toggleSound,playOnce}=useNotificationFeedback(),{user}=useUserPreferences();
 const [now,setNow]=useState(Date.now()),[dismissed,setDismissed]=useState(new Set());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 function isDismissed(key){try{return dismissed.has(key)||sessionStorage.getItem(`lifeai-dismissed:${user?.id}:${key}`)==='1'}catch{return dismissed.has(key)}}
 const visible=upcoming.map(item=>({...item,countdown:countdown(item.startsAt,now)})).filter(item=>item.countdown&&!isDismissed(item.key));
 const visibleKeys=visible.map(item=>item.key).join('|');
 useEffect(()=>{for(const key of visibleKeys.split('|').filter(Boolean))playOnce(key)},[visibleKeys,sound,playOnce]);
 function dismiss(key){setDismissed(current=>new Set([...current,key]));try{sessionStorage.setItem(`lifeai-dismissed:${user?.id}:${key}`,'1')}catch{/* current session state is enough */}}
 return <div className="live-notification-stack" aria-label="Avisos na tela">
 {visible.map(item=><aside key={item.key} className={`upcoming-toast ${item.kind}`} aria-label={`Próxima atividade: ${item.title}`}><header><span className="upcoming-toast-icon"><Clock3 size={19}/></span><div><small>{names[item.kind]||'Atividade'} · às {item.time}</small><strong role="status">Sua atividade começa em breve</strong></div><button type="button" onClick={()=>dismiss(item.key)} aria-label={`Dispensar aviso de ${item.title}`}><X size={16}/></button></header><h3>{item.title}</h3><div className="upcoming-countdown"><span>Começa em</span><strong role="timer" aria-label={`${item.countdown.seconds} segundos até começar`}>{item.countdown.text}</strong><small>minutos : segundos</small></div><progress value={item.countdown.seconds} max={300} aria-label="Tempo restante até a atividade"/><footer><Link onClick={()=>dismiss(item.key)} to={`/agenda?data=${item.date}&tipo=${item.kind}&item=${item.sourceId}`}>Ver na agenda<ArrowUpRight size={14}/></Link><button type="button" aria-pressed={sound} onClick={toggleSound} aria-label={sound?'Silenciar notificações':'Ativar som das notificações'}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>}</button></footer></aside>)}
 <div id="lifeai-water-toast"/>
 </div>;
}
