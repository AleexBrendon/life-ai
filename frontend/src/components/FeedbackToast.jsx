import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, X } from 'lucide-react';
import { showFeedback } from '../lib/actionFeedback';

export default function FeedbackToast({ message }) {
 useEffect(()=>{showFeedback(message)},[message]);
 return null;
}

export function FeedbackToastHost() {
 const [notice,setNotice]=useState(null),[host,setHost]=useState(document.body);
 useEffect(()=>{
  const receive=event=>setNotice({message:event.detail.message,id:Date.now()});
  window.addEventListener('lifeai:feedback',receive);
  const updateHost=()=>setHost(document.querySelector('dialog[open]')||document.body);
  const observer=new MutationObserver(updateHost);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  return()=>{window.removeEventListener('lifeai:feedback',receive);observer.disconnect()};
 },[]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),5000);return()=>clearTimeout(timer)},[notice]);
 if(!notice)return null;
 return createPortal(<aside key={notice.id} className="feedback-toast" aria-label="Confirmação"><CircleCheck size={21} aria-hidden="true"/><div role="status" aria-live="polite"><strong>Pronto!</strong><p>{notice.message}</p></div><button type="button" aria-label="Fechar aviso" onClick={()=>setNotice(null)}><X size={17}/></button></aside>,host);
}
