import {useCallback,useEffect,useRef} from 'react';
export default function useCancelableRequest(){
 const active=useRef(null);
 const cancel=useCallback(()=>{const current=active.current;active.current=null;current?.abort()},[]);
 useEffect(()=>cancel,[cancel]);
 const begin=useCallback(()=>{
  cancel();const controller=new AbortController();active.current=controller;
  return {signal:controller.signal,isCurrent:()=>active.current===controller&&!controller.signal.aborted,finish:()=>{if(active.current===controller)active.current=null}};
 },[cancel]);
 return {begin,cancel};
}
