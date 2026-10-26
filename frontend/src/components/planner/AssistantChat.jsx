import BudgetBreakdown from '../ai/BudgetBreakdown';
import useResponseVisibility from '../../lib/useResponseVisibility';
import useCancelableRequest from '../../lib/useCancelableRequest';
import AssistantSetup, { SetupProposal } from "./AssistantSetup";
import WeeklyPlanner, { WeeklyProposal } from "../ai/WeeklyPlanner";
import PurchaseAdvisor from "../ai/PurchaseAdvisor";
import MonthlyRoutine, { MonthlyProposal } from "../ai/MonthlyRoutine";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import api from "../../lib/api";

export default function AssistantChat() {
  const [params]=useSearchParams();
  const [mode, setMode] = useState(params.get("assistente")==="compras"?"shopping":params.get("assistente")==="semana"?"week":params.get("assistente")==="rotina"?"month":"chat");
  const [reviewVersion,setReviewVersion]=useState(0);
  function suggest(){if(busy)cancelSend();else request.cancel();setBusy(false);setNotice('');setReviewVersion(n=>n+1);setMode('month')}
  const [setupDraft,setSetupDraft]=useState('');
  const [financeReview,setFinanceReview]=useState(null);
  const [weekly,setWeekly]=useState(null),[shoppingQuery,setShoppingQuery]=useState("");
  const [setupProposal,setSetupProposal]=useState(null),[monthly,setMonthly]=useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const request=useCancelableRequest();
  const [notice,setNotice]=useState('');
  function cancelSend(){request.cancel();setBusy(false);setMessages(current=>current.map(row=>row.delivery==='sending'?{...row,delivery:'cancelled'}:row));setNotice('Envio cancelado. Seu texto foi preservado.');setError('')}
  function changeMode(next){if(next!==mode){if(busy)cancelSend();else setNotice('');setMode(next)}}
  const [error, setError] = useState("");
  const responseRef=useResponseVisibility(messages.length?`${messages.length}:${busy}:${error}`:null);
  async function send(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    const pending=request.begin();const messageId=crypto.randomUUID();
    setMessages(current=>[...current,{id:messageId,role:'user',content:message,delivery:'sending'}]);
    setBusy(true); setError("");setNotice('');
    try {
      const response = await api.post("/ai/chat", { message, history: messages.filter(row=>!row.requestFailure&&(!row.delivery||row.delivery==='sent')).slice(-6).map(({role,content})=>({role,content})), ...(setupProposal?{previousProposalId:setupProposal.id}:{}) },{signal:pending.signal});
      if(!pending.isCurrent())return;
      setMessages(current => [...current.map(row=>row.id===messageId?{...row,delivery:'sent'}:row), { role: 'assistant', content: response.data.message||'Solicitação processada. Confira as sugestões abaixo.' }]);
      setFinanceReview(response.data.financeAssessment||null);
      if(response.data.weeklyProposal)setWeekly(response.data.weeklyProposal);
      if(response.data.monthlyProposal)setMonthly(response.data.monthlyProposal);
      if(response.data.proposal!==undefined)setSetupProposal(response.data.proposal);
      if(response.data.questions?.length)setMessages(current=>[...current,{role:'assistant',content:response.data.questions.map(q=>`• ${q}`).join('\n')}]);
      if(response.data.mode==="shopping"){setShoppingQuery(response.data.query);setMode("shopping");}
      if(response.data.mode==="month")setMode("month");
      setDraft("");
    } catch (err) { if(pending.isCurrent()){const message=err.response?.data?.message||'Não foi possível obter uma resposta. Seu texto foi preservado para tentar novamente.';setError(message);setMessages(current=>[...current.map(row=>row.id===messageId?{...row,delivery:'failed'}:row),{role:'assistant',content:message,requestFailure:true}])} }
    finally { if(pending.isCurrent()){pending.finish();setBusy(false)} }
  }
  return <div className="assistant-layout"><nav className="studio-view-toggle assistant-mode-tabs" aria-label="Modo da assistente"><button aria-pressed={mode === "chat"} onClick={() => changeMode("chat")}>Conversar</button><button aria-pressed={mode === "month"} onClick={() => changeMode("month")}>Rotina do mês</button><button aria-pressed={mode === "setup"} onClick={() => changeMode("setup")}>Cadastrar rotina</button><button aria-pressed={mode === "week"} onClick={()=>changeMode("week")}>Reorganizar semana</button><button aria-pressed={mode === "shopping"} onClick={()=>changeMode("shopping")}>Compras</button></nav><div className="assistant-review-bar"><span>Quer que a IA remonte sua rotina com tudo o que está cadastrado?</span><button type="button" className="studio-button secondary" onClick={suggest}><Sparkles size={15}/>Remontar minha rotina com IA</button></div><div className="assistant-content-scroll" key={mode}>{mode === "setup" ? <AssistantSetup draft={setupDraft} onDraftChange={setSetupDraft} onSuggest={suggest}/> : mode === "month" ? <MonthlyRoutine key={reviewVersion} reviewOnOpen={reviewVersion>0}/> : mode === "week" ? <WeeklyPlanner/> : mode === "shopping" ? <PurchaseAdvisor initialQuery={shoppingQuery}/> : <section className="assistant-chat">
    <div className="assistant-messages" aria-live="polite" aria-busy={busy}>
      {!messages.length && <div className="assistant-welcome"><Sparkles size={28} /><h2>Vamos montar sua rotina?</h2><p>Descreva suas atividades com frequência, dias ou horários e eu encaixo tudo nos seus horários livres. Você revisa antes de salvar.</p><button type="button" className="studio-button secondary" onClick={() => changeMode("setup")}>Quero cadastrar minha rotina pela conversa</button><button type="button" className="studio-button secondary" onClick={() => setDraft("Monte minha rotina com tudo que já cadastrei, focando em saúde e desempenho")}>Monte minha rotina com o que já tenho</button><button type="button" className="studio-button secondary" onClick={() => setDraft("Quero treinar flauta 3 vezes por semana, 30 minutos, e academia segunda, quarta e sexta de manhã")}>Exemplo: adicionar atividades</button></div>}
      {messages.map((item, index) => <article key={index} className={`assistant-message ${item.role}`}><small>{item.role === "user" ? "Você" : "LifeAI"}</small><p>{item.content}</p>{item.delivery&&<small className={`assistant-delivery ${item.delivery}`}>{({sending:'Enviando…',sent:'Enviada',failed:'Falhou — texto preservado',cancelled:'Envio cancelado'})[item.delivery]}</small>}</article>)}
      {busy && <p role="status">Pensando na sua rotina...</p>}
    <div ref={responseRef}/></div>
    {notice&&<p role="status" className="assistant-note">{notice}</p>}
    {error && <p role="alert" className="reminder-form-error">{error}</p>}
    <form onSubmit={send} className="assistant-composer"><label htmlFor="assistant-message">Sua mensagem</label><textarea id="assistant-message" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!event.repeat && !busy && draft.trim()) event.currentTarget.form.requestSubmit(); } }} maxLength={2000} rows={3} placeholder="Ex.: quero correr 3 vezes por semana de manhã, 40 minutos" disabled={busy} /><div className="assistant-composer-actions">{busy&&<button type="button" className="assistant-cancel-send" onClick={cancelSend}><X size={16}/>Cancelar envio</button>}<button type="submit" disabled={busy || !draft.trim()}><Send size={16} />{busy ? "Enviando..." : "Enviar"}</button></div></form>
    <small className="assistant-note">Enter envia · Shift+Enter quebra a linha. A conversa fica nesta sessão.</small>
    {financeReview&&<BudgetBreakdown budget={financeReview}/>}
    {weekly&&<WeeklyProposal key={weekly.id} proposal={weekly} onDone={()=>setWeekly(null)} onRefresh={()=>setMode("week")}/>}
    {monthly&&<MonthlyProposal key={monthly.id} proposal={monthly} onDone={()=>setMonthly(null)} onRefresh={suggest}/>}
    {setupProposal&&<SetupProposal key={setupProposal.id} proposal={setupProposal} busy={busy} onDone={action=>{setSetupProposal(null);setMessages(current=>[...current,{role:'assistant',content:action==='applied'?'Pronto, salvei. Quer que eu reorganize a semana inteira com esses horários? Peça “remonte minha rotina”.':'Proposta descartada. Descreva de outro jeito se quiser que eu monte de novo.'}])}}/>}
  </section>}</div></div>;
}


