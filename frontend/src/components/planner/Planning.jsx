import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import EntityManager from './EntityManager';
import Kanban from './Kanban';
import { WaterPlanning, FinancePlanning } from './PersonalPlanning';
const sections=[['rotinas','Rotinas'],['metas','Metas'],['trabalho','Trabalho'],['lembretes','Lembretes'],['agua','Água'],['financas','Finanças'],['imprevistos','Imprevistos']];
export default function Planning(){
 const [params,setParams]=useSearchParams();const kind=sections.some(([id])=>id===params.get('aba'))?params.get('aba'):'rotinas';const [view,setView]=useState('board');
 return <section className="simple-planning"><div className="simple-intro"><span>SEUS PLANOS, SEU RITMO</span><h1>Faça espaço para o que importa.</h1><p>Organize sua rotina e acompanhe cada pequeno avanço.</p></div><nav className="simple-tabs" aria-label="Áreas do planejamento">{sections.map(([id,label])=><button key={id} aria-current={kind===id?'page':undefined} onClick={()=>setParams({aba:id})}>{label}</button>)}</nav>
 {kind==='trabalho'&&<nav className="studio-view-toggle" aria-label="Visualização do trabalho"><button aria-pressed={view==='board'} onClick={()=>setView('board')}>Kanban de tarefas</button><button aria-pressed={view==='records'} onClick={()=>setView('records')}>Trabalhos e jornadas</button></nav>}
 {kind==='agua'?<WaterPlanning/>:kind==='financas'?<FinancePlanning/>:kind==='trabalho'&&view==='board'?<Kanban/>:<EntityManager key={kind} kind={kind}/>}
 </section>;
}
