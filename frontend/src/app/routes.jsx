import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import Dashboard from "../components/dashboard/Dashboard";
import Calendar from "../components/planner/Calendar";
import Planning from "../components/planner/Planning";
import Login from "../components/auth/Login";
import FinancePage from '../components/finance/FinancePage';
import { authApi } from "../lib/api";
function AppRoutes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lifeai_token");

    if (!token) {
      setCheckingSession(false);
      return;
    }

    authApi.me()
      .then((response) => {
        setUser(response.data.user)
      })
      .catch(() => {
        localStorage.removeItem("lifeai_token");
        setUser(null);
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, []);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn("Não foi possível confirmar a revogação da sessão no servidor.", error.response?.status);
    } finally {
      localStorage.removeItem("lifeai_token");
      setUser(null);
      navigate("/dashboard", { replace: true });
    }
  }

  if (checkingSession) {
    return <div className="app-loading">Carregando sua sessão...</div>;
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
        <Route path="/meu-dia" element={<Navigate to="/agenda" replace />} />
        <Route path="/calendario" element={<Navigate to="/agenda" replace />} />
        {["rotinas", "metas", "trabalho", "lembretes"].map(tab => (
          <Route key={tab} path={`/${tab}/*`} element={<Navigate to={`/planejamento?aba=${tab}`} replace />} />
        ))}
        <Route path="/configuracoes" element={<Navigate to="/planejamento?aba=perfil" replace />} />
        <Route path="/notificacoes" element={<Navigate to="/planejamento?aba=notificacoes" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;



