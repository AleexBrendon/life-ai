import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import Dashboard from "../components/dashboard/Dashboard";
import Calendar from "../components/planner/Calendar";
import Planning from "../components/planner/Planning";
import Login from "../components/auth/Login";
import FinancePage from '../components/finance/FinancePage';
const EvolutionPage = lazy(() => import('../components/evolution/EvolutionPage'));
import { authApi } from "../lib/api";
import { endSession, getSessionToken, SESSION_EXPIRED_EVENT, clearSessionToken } from "../lib/session";
function AppRoutes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(getSessionToken()));
  const [sessionError, setSessionError] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const handleSessionExpired = () => {
      setUser(null);
      setSessionError(false);
      setCheckingSession(false);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    if (!getSessionToken()) {
      return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    }

    authApi.me()
      .then((response) => {
        if (active) {
          setUser(response.data.user);
          setSessionError(false);
        }
      })
      .catch((error) => {
        if (!active) return;
        setUser(null);
        setSessionError(error.response?.status !== 401);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [restoreAttempt]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn("Não foi possível confirmar a revogação da sessão no servidor.", error.response?.status);
    } finally {
      endSession();
      setUser(null);
      navigate("/dashboard", { replace: true });
    }
  }

  if (checkingSession) {
    return <div className="app-loading">Carregando sua sessão...</div>;
  }

  if (sessionError) {
    return (
      <main className="session-restore-error">
        <div>
          <h1>Não foi possível confirmar sua sessão.</h1>
          <p>Seus dados de acesso foram preservados. Verifique a conexão e tente novamente.</p>
          <div>
            <button type="button" className="studio-button" onClick={() => {
              setCheckingSession(true);
              setRestoreAttempt((attempt) => attempt + 1);
            }}>Tentar novamente</button>
            <button type="button" className="studio-button secondary" onClick={() => {
              clearSessionToken();
              setSessionError(false);
            }}>Entrar com outra conta</button>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Login onAuthenticated={setUser} />;
  }

  return (
    <Routes>
      <Route element={<AppShell onLogout={handleLogout} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agenda" element={<Calendar />} />
        <Route path="/planejamento" element={<Planning />} />
        <Route path="/financeiro" element={<FinancePage />} />
        <Route path="/evolucao" element={<Suspense fallback={<p role="status">Carregando recursos…</p>}><EvolutionPage /></Suspense>} />
        <Route path="/meu-dia" element={<Navigate to="/agenda" replace />} />
        <Route path="/calendario" element={<Navigate to="/agenda" replace />} />
        {["rotinas", "metas", "trabalho", "lembretes"].map(tab => (
          <Route key={tab} path={`/${tab}/*`} element={<Navigate to={`/planejamento?aba=${tab}`} replace />} />
        ))}
        <Route path="/configuracoes" element={<Navigate to="/dashboard?painel=perfil" replace />} />
        <Route path="/notificacoes" element={<Navigate to="/dashboard?painel=notificacoes" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;

