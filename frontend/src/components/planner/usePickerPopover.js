import {useEffect,useRef,useState} from 'react';
export default function usePickerPopover(disabled=false){
 const anchor=useRef(null),panel=useRef(null),[open,setOpen]=useState(false);
 function position(){const p=panel.current;if(!anchor.current||!p?.matches(':popover-open'))return;const a=anchor.current.getBoundingClientRect(),b=p.getBoundingClientRect();p.style.left=`${Math.max(12,Math.min(a.left,innerWidth-b.width-12))}px`;p.style.top=`${Math.max(12,Math.min(innerHeight-b.height-12,a.bottom+8+b.height<=innerHeight-12?a.bottom+8:a.top-b.height-8))}px`}
 function show(){if(disabled)return;const p=panel.current;if(p.matches(':popover-open'))p.hidePopover();else{p.showPopover();position()}}
 function close(){if(panel.current?.matches(':popover-open'))panel.current.hidePopover();anchor.current?.focus()}
 useEffect(()=>{const observer=new ResizeObserver(position);if(panel.current)observer.observe(panel.current);const escape=e=>{if(e.key==='Escape'&&panel.current?.matches(':popover-open')){e.preventDefault();e.stopImmediatePropagation();close()}};document.addEventListener('keydown',escape,true);window.addEventListener('resize',position);window.addEventListener('scroll',position,true);return()=>{observer.disconnect();document.removeEventListener('keydown',escape,true);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true)}},[]);
 return {anchor,panel,open,show,close,onToggle:e=>{setOpen(e.newState==='open');if(e.newState==='open')position()}};
}
