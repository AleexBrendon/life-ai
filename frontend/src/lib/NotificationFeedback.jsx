import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from './api';
import { useUserPreferences } from './UserPreferences';

const Feedback=createContext(null);
export const useNotificationFeedback=()=>useContext(Feedback);
export function NotificationFeedbackProvider({children}){
 const {user}=useUserPreferences();
 const [notifications,setNotifications]=useState([]),[upcoming,setUpcoming]=useState([]),[sound,setSound]=useState(true),[soundError,setSoundError]=useState('');
 const audio=useRef(null),enabled=useRef(true),played=useRef(new Set()),seen=useRef(null),nextTone=useRef(0),nodes=useRef(new Set());
 const playOnce=useCallback(key=>{
  if(!enabled.current||!audio.current||audio.current.state!=='running'||played.current.has(key))return;
  played.current.add(key);
  const context=audio.current,start=Math.max(context.currentTime,nextTone.current);
  nextTone.current=start+.48;
  for(const [offset,frequency] of [[0,660],[.16,880]]){
   const oscillator=context.createOscillator(),gain=context.createGain();
   oscillator.connect(gain);gain.connect(context.destination);oscillator.frequency.value=frequency;
   gain.gain.setValueAtTime(0,start+offset);gain.gain.linearRampToValueAtTime(.055,start+offset+.02);gain.gain.exponentialRampToValueAtTime(.001,start+offset+.22);
   nodes.current.add(oscillator);oscillator.onended=()=>{nodes.current.delete(oscillator);oscillator.disconnect();gain.disconnect()};oscillator.start(start+offset);oscillator.stop(start+offset+.24);
  }
 },[]);
 async function toggleSound(){
  if(enabled.current){enabled.current=false;setSound(false);for(const node of nodes.current){try{node.stop()}catch{/* already stopped */}}nextTone.current=0;return;}
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error();audio.current ||=new Audio();await audio.current.resume();enabled.current=true;setSound(true);setSoundError('');playOnce(`sound-test:${Date.now()}`)}
  catch{setSoundError('O navegador não liberou o áudio. Os avisos visuais continuam ativos.')}
 }
 useEffect(()=>{
  enabled.current=true;
  const unlock=()=>{
   if(!enabled.current||audio.current?.state==='running')return;
   try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){setSoundError('Este navegador não oferece áudio para os avisos.');return;}
    if(!audio.current||audio.current.state==='closed')audio.current=new Audio();
    audio.current.resume().then(()=>{if(enabled.current)setSoundError('')}).catch(()=>{});
   }catch{/* Retry on the next interaction when autoplay is restricted. */}
  };
  window.addEventListener('pointerdown',unlock,true);
  window.addEventListener('keydown',unlock,true);
  return()=>{
   window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);
   enabled.current=false;audio.current?.close().catch(()=>{});audio.current=null;
  };
 },[]);
 useEffect(()=>{
  if(!user?.id)return;
  let active=true,inFlight=false,pending=false;
  const refresh=async()=>{
   if(inFlight){pending=true;return;}inFlight=true;
   const [messages,activities]=await Promise.allSettled([api.get('/notifications'),api.get('/notifications/upcoming')]);
   if(active){
    if(messages.status==='fulfilled'){
     const rows=messages.value.data;
     if(seen.current)for(const row of [...rows].reverse())if(!seen.current.has(row.id)&&!row.isRead)playOnce(row.dedupKey||`notification:${row.id}`);
     seen.current=new Set(rows.map(row=>row.id));setNotifications(rows);
    }
    if(activities.status==='fulfilled')setUpcoming(activities.value.data);else setUpcoming([]);
   }
   inFlight=false;
   if(pending&&active){pending=false;refresh();}
  };
  refresh();const timer=setInterval(refresh,15000);
  const visible=()=>{if(document.visibilityState==='visible')refresh()};
  for(const event of ['lifeai:notifications-updated','lifeai:agenda-updated','lifeai:profile-updated','focus'])window.addEventListener(event,refresh);
  document.addEventListener('visibilitychange',visible);
  return()=>{active=false;clearInterval(timer);for(const event of ['lifeai:notifications-updated','lifeai:agenda-updated','lifeai:profile-updated','focus'])window.removeEventListener(event,refresh);document.removeEventListener('visibilitychange',visible)};
 },[user?.id,playOnce]);
 return <Feedback.Provider value={{notifications,upcoming,sound,soundError,toggleSound,playOnce}}>{children}</Feedback.Provider>;
}
