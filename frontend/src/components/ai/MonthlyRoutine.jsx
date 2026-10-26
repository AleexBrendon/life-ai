import {TimePicker} from '../planner/ScheduleInputs';
import CommitmentTiming from './CommitmentTiming';
import { useEffect,useState } from 'react';
import { CalendarCheck,Check,ClipboardList,Eye,RefreshCw,Sparkles,X } from 'lucide-react';
import { Dialog } from '../planner/EntityManager';
import RoutinePreview from './RoutinePreview';
import api from '../../lib/api';
import { showFeedback } from '../../lib/actionFeedback';
import useResponseVisibility from '../../lib/useResponseVisibility';
import { weekdays } from '../planner/entityConfig';
const date=value=>new Date(value+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'});
const percent=value=>value==null?'—':`${Math.round(value*100)}%`;
const slotText=slot=>`${weekdays[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime}`;
function CycleSummary({status}){
 const {cycle,performance}=status;
 const weak=(performance?.items||[]).filter(item=>item.rate!=null&&item.rate<0.6).slice(0,4);
 return <section className="monthly-cycle"><header><CalendarCheck size={18}/><div><h3>Ciclo atual · {date(cycle.startDate)} a {date(cycle.endDate)}</h3><p>{cycle.ended?'O ciclo terminou. Conclua a avaliação e monte a próxima rotina.':cycle.daysLeft?`Faltam ${cycle.daysLeft} dia(s). A avaliação abre nos três últimos dias.`:'Hoje é o último dia do ciclo.'}</p></div></header>
 <div className="monthly-stats"><div><strong>{percent(performance?.rate)}</strong><span>atividades concluídas</span></div><div><strong>{performance?.completed??0}/{performance?.total??0}</strong><span>concluídas / previstas</span></div><div><strong>{performance?.skipped??0}</strong><span>puladas</span></div><div><strong>{performance?.notMarked??0}</strong><span>sem registro</span></div></div>
 {weak.length>0&&<p className="ai-help">Menor adesão: {weak.map(item=>`${item.title} (${percent(item.rate)})`).join(', ')}. A próxima rotina sugere outros horários para elas.</p>}
 {performance?.notMarked>0&&<p className="ai-help">Marque as atividades como concluídas ou puladas na agenda para a análise ficar mais precisa.</p>}</section>;
}
function Checkin({cycle,steps,onSaved}){
 const next=steps.find(step=>step.available&&!step.answered);
 const [answers,setAnswers]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setAnswers({});setError('')},[next?.step]);
 const done=steps.filter(step=>step.answered).length;
 if(!next)return done===3?<p className="assistant-result-summary" role="status">Avaliação concluída. Suas respostas serão usadas para montar a próxima rotina.</p>:null;
 const complete=next.questions.every(question=>question.type!=='scale'||typeof answers[question.id]==='number');
 async function submit(event){event.preventDefault();if(!complete||busy)return;setBusy(true);setError('');try{await api.post(`/ai/routine/cycle/${cycle.id}/checkin/${next.step}`,{answers});showFeedback('Respostas salvas. Obrigado!');onSaved()}catch(e){setError(e.response?.data?.message||'Não foi possível salvar as respostas.')}finally{setBusy(false)}}
 return <form className="monthly-checkin ai-option" onSubmit={submit}><header><h3><ClipboardList size={16}/> Avaliação {next.step}/3 · {next.title}</h3><span>{done} de 3 respondidas</span></header><p className="ai-help">Responda com sinceridade: as respostas ficam salvas e orientam a rotina do próximo ciclo.</p>
 {next.questions.map(question=><fieldset key={question.id} className="monthly-question"><legend>{question.text}</legend>{question.type==='scale'?<><div className="monthly-scale" role="radiogroup">{[1,2,3,4,5].map(value=><button type="button" key={value} role="radio" aria-checked={answers[question.id]===value} className={answers[question.id]===value?'selected':''} onClick={()=>setAnswers(current=>({...current,[question.id]:value}))}>{value}</button>)}</div><small>1 = {question.low} · 5 = {question.high}</small></>:<textarea rows={2} maxLength={1000} value={answers[question.id]||''} onChange={e=>setAnswers(current=>({...current,[question.id]:e.target.value}))} placeholder="Opcional"/>}</fieldset>)}
 {error&&<p role="alert" className="studio-error">{error}</p>}<button type="submit" className="studio-button" disabled={!complete||busy}><Check size={15}/>{busy?'Salvando…':'Enviar respostas'}</button></form>;
}
export function MonthlyProposal({proposal,onDone,onRefresh}){
 const plan=proposal.changes,[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [selectedId,setSelectedId]=useState(null),[previewId,setPreviewId]=useState(null),[confirming,setConfirming]=useState(false);
 const selected=plan.options.find(option=>option.id===selectedId),previewing=plan.options.find(option=>option.id===previewId);
 const pending=proposal.status==='PENDING';
 async function decide(optionId){setBusy(true);setError('');try{if(optionId){const r=await api.post(`/ai/routine/${proposal.id}/apply`,{optionId});showFeedback(`Rotina aprovada para ${date(r.data.startDate)} a ${date(r.data.endDate)}.`)}else{await api.post(`/ai/recommendations/${proposal.id}/reject`);showFeedback('Sugestões descartadas.')}setConfirming(false);window.dispatchEvent(new Event('lifeai:agenda-updated'));onDone()}catch(e){setError(e.response?.data?.message||'Não foi possível aplicar. Gere uma nova rotina.');setConfirming(false)}finally{setBusy(false)}}
 const choose=id=>{setSelectedId(id);setPreviewId(null)};
 return <section className="weekly-proposal monthly-proposal"><div className="ai-analysis-meta"><span className="studio-badge">{plan.mode==='assisted'?'Análise assistida por IA':'Planejamento local'}</span><span>Ciclo de {date(plan.period.start)} a {date(plan.period.end)}</span></div>
 <CommitmentTiming items={plan.commitments}/>{plan.limitations?.map(note=><p className="ai-help" key={note}>{note}</p>)}<p className="ai-analysis-text">{proposal.reason}</p>
 <div className="monthly-score"><div><span>Rotina atual</span><strong>{plan.before.score}</strong></div>{plan.options.map(option=><div key={option.id} className={option.id===plan.recommended?'recommended':''}><span>{option.title}</span><strong>{option.metrics.score}</strong></div>)}</div>
 <p className="ai-help">Pontuação de 0 a 100: conflitos, horários tardios, refeições, recuperação entre treinos, sobrecarga do dia e atividades sem horário. Use <b>Ver como fica</b> para ver cada sugestão desenhada na semana e no mês, selecione a que preferir e confirme no final.</p>
 {plan.before.issues.length>0&&<details className="monthly-issues"><summary>O que encontrei na rotina atual ({plan.before.issues.length})</summary><ul>{plan.before.issues.map(text=><li key={text}>{text}</li>)}</ul></details>}
 {plan.feedback&&(plan.feedback.notes.length>0||plan.feedback.lowAdherence.length>0)&&<p className="ai-help">Considerei {plan.feedback.lowAdherence.length} atividade(s) com baixa adesão e {plan.feedback.notes.length} comentário(s) da sua avaliação.</p>}
 {plan.options.map(option=>{const routines=option.changes.filter(change=>change.kind==='rotinas'),goals=option.changes.filter(change=>change.kind==='metas'),isSelected=option.id===selectedId;return <article className={`ai-option monthly-option ${isSelected?'selected':''}`} key={option.id}><header><h3>{option.title}{option.id===plan.recommended&&<span className="studio-badge monthly-recommended">Recomendada</span>}{isSelected&&<span className="studio-badge monthly-selected-badge">Selecionada</span>}</h3><span>Pontuação {option.metrics.score}</span></header><p>{option.description}</p>
  {routines.length>0&&<><h4>Rotinas · {routines.length} ajuste(s)</h4><ul className="ai-change-list">{routines.map(change=><li key={change.key}><div><strong>{change.title}</strong><small>{change.reasons.join(' · ')}</small></div><span>{change.old?<s>{slotText(change.old)}</s>:<span className="studio-badge">Novo</span>}<b>{slotText(change.new)}</b></span></li>)}</ul></>}
  {goals.length>0&&<><h4>Metas · sessões semanais no ciclo</h4><ul className="ai-change-list">{goals.map(change=><li key={change.key}><div><strong>{change.title}</strong><small>{change.reasons.join(' · ')}</small></div><span>{change.old&&(change.old.dayOfWeek!==change.new.dayOfWeek||change.old.startTime!==change.new.startTime)&&<s>{slotText(change.old)}</s>}<b>{slotText(change.new)}</b></span></li>)}</ul></>}
  {!routines.length&&option.id!=='keep'&&<p className="ai-help">Nenhuma rotina precisa mudar nesta alternativa.</p>}
  {option.unresolved.length>0&&<div className="ai-unresolved"><strong>Sem espaço</strong><ul>{option.unresolved.map(text=><li key={text}>{text}</li>)}</ul></div>}
  <div className="monthly-option-actions"><button type="button" className="studio-button secondary" disabled={busy} onClick={()=>setPreviewId(option.id)}><Eye size={15}/>Ver como fica</button><button type="button" className={`studio-button ${isSelected?'':'secondary'}`} aria-pressed={isSelected} disabled={busy||!option.applicable||!pending} onClick={()=>choose(isSelected?null:option.id)}>{isSelected?<><Check size={15}/>Selecionada</>:'Selecionar esta rotina'}</button></div></article>})}
 {error&&<p role="alert" className="studio-error">{error}</p>}
 <div className="monthly-confirm-bar"><div><strong>{selected?selected.title:'Nenhuma rotina selecionada'}</strong><span>{selected?`Pontuação ${selected.metrics.score} · ${selected.changes.length} ajuste(s)`:'Selecione uma das sugestões acima.'}</span></div><button type="button" className="studio-button" disabled={!selected||busy||!pending} onClick={()=>setConfirming(true)}><Check size={15}/>Confirmar rotina selecionada</button></div>
 <div className="ai-inline-actions">{onRefresh&&<button type="button" className="studio-button secondary" disabled={busy} onClick={onRefresh}><RefreshCw size={14}/>Gerar novamente</button>}<button type="button" className="studio-button secondary" disabled={busy||!pending} onClick={()=>decide(null)}><X size={14}/>Descartar sugestões</button></div>
 {previewing&&<Dialog title={previewing.title} subtitle="Como sua semana fica com esta sugestão. Nada foi salvo." onClose={()=>setPreviewId(null)} className="routine-preview-dialog"><div className="studio-editor-body"><RoutinePreview plan={plan} option={previewing}/></div><footer><button type="button" className="studio-button secondary" onClick={()=>setPreviewId(null)}>Fechar</button><button type="button" className="studio-button" disabled={!previewing.applicable||!pending} onClick={()=>choose(previewing.id)}><Check size={15}/>{previewing.id===selectedId?'Selecionada':'Selecionar esta rotina'}</button></footer></Dialog>}
 {confirming&&selected&&<Dialog title="Aderir a esta rotina?" subtitle={`${selected.title} · ciclo de ${date(plan.period.start)} a ${date(plan.period.end)}`} onClose={()=>setConfirming(false)} busy={busy} className="routine-confirm-dialog"><div className="studio-editor-body"><ul className="routine-confirm-list"><li>Os horários de <b>{selected.changes.filter(change=>change.kind==='rotinas').length}</b> rotina(s) mudam para todas as semanas.</li><li>As metas recebem <b>{selected.template.goals.length}</b> sessão(ões) por semana até o fim do ciclo.</li><li>Trabalho e compromissos fixos continuam como estão.</li><li>Começa um novo ciclo mensal; nos três últimos dias você avalia como foi.</li></ul>{error&&<p role="alert" className="studio-error">{error}</p>}</div><footer><button type="button" className="studio-button secondary" disabled={busy} onClick={()=>setConfirming(false)}>Voltar</button><button type="button" className="studio-button" disabled={busy} onClick={()=>decide(selected.id)}><Check size={15}/>{busy?'Aplicando…':'Confirmar e aderir'}</button></footer></Dialog>}
 </section>;
}
export default function MonthlyRoutine({reviewOnOpen=false}){
 const [status,setStatus]=useState(null),[proposal,setProposal]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [message,setMessage]=useState(''),[dayStart,setDayStart]=useState('06:00'),[flexEnd,setFlexEnd]=useState('22:00'),[meals,setMeals]=useState(true);
 const responseRef=useResponseVisibility(busy?'loading':error||proposal?.id||null);
 useEffect(()=>{let active=true;setLoading(true);api.get('/ai/routine/cycle').then(r=>{if(active){setStatus(r.data);setProposal(current=>current||r.data.proposal||null)}}).catch(e=>{if(active)setError(e.response?.data?.message||'Não foi possível carregar o ciclo da rotina.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[revision]);
 async function generate(){if(busy)return;setBusy(true);setError('');setProposal(null);try{const r=await api.post('/ai/routine/preview',{message,dayStart,flexEnd,protectMeals:meals});setProposal(r.data)}catch(e){setError(e.response?.data?.message||'Não foi possível montar a rotina.')}finally{setBusy(false)}}
 useEffect(()=>{if(reviewOnOpen)generate()},[reviewOnOpen]);
 const cycle=status?.cycle,checkinDone=cycle&&status.checkin.every(step=>step.answered);
 return <div className="weekly-planner monthly-routine"><header className="ai-feature-intro"><Sparkles size={21}/><div><h2>Rotina do mês</h2><p>A IA analisa todos os seus cadastros e monta uma semana-modelo focada em saúde, desempenho e eficiência. Trabalho e compromissos fixos ficam preservados. A rotina vale por um ciclo mensal e é reavaliada com seus resultados e respostas.</p></div></header>
 {loading&&<p role="status">Carregando seu ciclo…</p>}
 {cycle&&<CycleSummary status={status}/>}
 {cycle&&cycle.checkinOpen&&<Checkin cycle={cycle} steps={status.checkin} onSaved={()=>setRevision(n=>n+1)}/>}
 {!loading&&!cycle&&<p className="assistant-result-summary">Você ainda não tem um ciclo de rotina ativo. Gere a primeira rotina para começar o acompanhamento mensal.</p>}
 {cycle&&checkinDone&&!proposal&&<p className="assistant-result-summary">Tudo pronto para montar a rotina do próximo ciclo com base nos seus resultados.</p>}
 <details className="ai-week-preferences" open={!proposal}><summary>Preferências para montar a rotina</summary><div className="ai-planner-controls">
  <label className="studio-field"><span>O que você quer priorizar?</span><textarea rows={2} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ex.: dormir melhor, estudar para a faculdade, correr três vezes por semana." disabled={busy}/></label>
  <div className="monthly-times"><label className="studio-field"><span>Atividades a partir de</span><TimePicker value={dayStart} onChange={value=>setDayStart(value)} disabled={busy}/></label><label className="studio-field"><span>Terminar no máximo às</span><TimePicker value={flexEnd} onChange={value=>setFlexEnd(value)} disabled={busy}/></label></div>
  <label className="ai-check"><input type="checkbox" checked={meals} onChange={e=>setMeals(e.target.checked)} disabled={busy}/>Reservar almoço (12h–13h) e jantar (19h–19h30)</label>
  <button className="studio-button" type="button" disabled={busy||loading} onClick={generate}>{busy?'Montando sua rotina…':cycle?'Montar rotina do próximo ciclo':'Montar minha rotina do mês'}</button></div></details>
 <div ref={responseRef}/>{busy&&<p role="status" className="ai-help">Avaliando conflitos, sono, descanso, carga de cada dia e o desempenho do ciclo…</p>}{error&&<p role="alert" className="studio-error">{error}</p>}
 {proposal&&!busy&&<MonthlyProposal key={proposal.id} proposal={proposal} onRefresh={generate} onDone={()=>{setProposal(null);setRevision(n=>n+1)}}/>}</div>;
}
