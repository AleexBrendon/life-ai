import {useEffect,useRef} from 'react';
export default function useResponseVisibility(trigger){
 const ref=useRef(null);
 useEffect(()=>{if(trigger==null)return;ref.current?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})},[trigger]);
 return ref;
}
