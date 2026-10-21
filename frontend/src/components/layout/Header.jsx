import { useEffect, useRef, useState } from "react";
import { Bell, Settings as SettingsIcon, Sparkles, X, LogOut, Volume2, VolumeX } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { navigationItems } from "../../config/navigation";
import { ProfileSettings, NotificationCenter } from "../planner/AccountPanels";
import AssistantChat from "../planner/AssistantChat";
import { useNotificationFeedback } from '../../lib/NotificationFeedback';
import { UserAvatar } from '../../lib/UserPreferences';

const panels = { notificacoes: ["Notificações", NotificationCenter], perfil: ["Configurações", ProfileSettings], ia: ["Converse com a IA", AssistantChat] };
export default function Header({ onLogout }) {
  const [loggingOut, setLoggingOut] = useState(false);
  async function logout() { if (loggingOut) return; setLoggingOut(true); try { await onLogout(); } finally { setLoggingOut(false); } }
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const dialog = useRef(null);
  const key = params.get("painel") || params.get("aba");
  const panel = panels[key];
  const {notifications,sound,soundError,toggleSound}=useNotificationFeedback();
  const unread=notifications.filter(item=>!item.isRead).length;
  function open(id) { const next = new URLSearchParams(params); next.set("painel", id); setParams(next); }
  function close() { const next = new URLSearchParams(params); next.delete("painel"); if (panels[next.get("aba")]) next.delete("aba"); setParams(next, { replace: true }); }
  useEffect(() => {
    if (!panel) return;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, [key, panel]);
  const Content = panel?.[1];
  return <>
    <header className="app-header"><strong>{navigationItems.find(item => item.path === pathname)?.label || "LifeAI"}</strong><div className="header-actions">
      <button onClick={() => open("ia")} className="assistant-trigger" aria-label="Conversar com a IA"><Sparkles size={17} /><span>Assistente IA</span></button>
      <button onClick={() => open("notificacoes")} className="header-icon-button notification-bell" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`}><Bell size={20} />{unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}</button>
      <button type="button" onClick={toggleSound} className="header-icon-button notification-sound-toggle" aria-pressed={sound} title={sound?'Silenciar notificações':'Ativar som das notificações'} aria-label={sound?'Silenciar notificações':'Ativar som das notificações'}>{sound?<Volume2 size={20}/>:<VolumeX size={20}/>}</button>
      <button onClick={() => open("perfil")} className="header-icon-button" aria-label="Configurações"><SettingsIcon size={20} /></button>
      <button onClick={() => open('perfil')} className="header-avatar-button" aria-label="Abrir meu perfil"><UserAvatar/></button>
      <button type="button" onClick={logout} disabled={loggingOut} className="logout-button" aria-label="Sair da conta"><LogOut size={17} /><span>{loggingOut ? "Saindo..." : "Sair"}</span></button>
    </div></header>
    {soundError&&<p className="notification-sound-error" role="alert">{soundError}</p>}
    {panel && <dialog ref={dialog} className="workspace-panel" aria-labelledby="workspace-panel-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if(event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <header className="workspace-panel-heading"><h2 id="workspace-panel-title">{panel[0]}</h2><button onClick={close} aria-label="Fechar painel"><X size={19} /></button></header><div className="workspace-panel-content"><Content /></div>
    </dialog>}
  </>;
}


