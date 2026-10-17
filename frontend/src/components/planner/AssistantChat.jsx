import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import api from "../../lib/api";

export default function AssistantChat() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true); setError("");
    try {
      const response = await api.post("/ai/chat", { message, history: messages.slice(-6) });
      setMessages(current => [...current, { role: "user", content: message }, { role: "assistant", content: response.data.message }]);
      setDraft("");
    } catch (err) { setError(err.response?.data?.message || "Não foi possível enviar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <section className="assistant-chat">
    <div className="assistant-messages" aria-live="polite" aria-busy={busy}>
      {!messages.length && <div className="assistant-welcome"><Sparkles size={28} /><h2>Vamos organizar seu dia?</h2><p>Posso ajudar a definir prioridades e encontrar espaço na sua rotina.</p><button onClick={() => setDraft("Como posso organizar melhor meu dia?")}>Como organizar meu dia?</button></div>}
      {messages.map((item, index) => <article key={index} className={`assistant-message ${item.role}`}><small>{item.role === "user" ? "Você" : "LifeAI"}</small><p>{item.content}</p></article>)}
      {busy && <p role="status">Pensando na sua rotina...</p>}
    </div>
    {error && <p role="alert" className="reminder-form-error">{error}</p>}
    <form onSubmit={send} className="assistant-composer"><label htmlFor="assistant-message">Sua mensagem</label><textarea id="assistant-message" value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={3} placeholder="O que você gostaria de organizar?" disabled={busy} /><button type="submit" disabled={busy || !draft.trim()}><Send size={16} />{busy ? "Enviando..." : "Enviar"}</button></form>
    <small className="assistant-note">A conversa fica nesta sessão. Sugestões não alteram sua agenda automaticamente.</small>
  </section>;
}
