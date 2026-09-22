import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import AppShell from "../components/layout/AppShell";
import Dashboard from "../components/dashboard/Dashboard";
import MyDay from "../components/day/MyDay";
import Replanning from "../components/day/Replanning";
import Calendar from "../components/planner/Calendar";
import Routines from "../components/planner/Routines";
import Goals from "../components/planner/Goals";
import RoutineDetail from "../components/planner/RoutineDetail";
import GoalDetail from "../components/planner/GoalDetail";
import GoalPlanning from "../components/planner/GoalPlanning";
import {
  Incidents,
  Insights,
  Notifications,
  Reminders,
  Settings,
  Work,
} from "../components/planner/OtherPages";
import Login from "../components/auth/Login";
import { authApi } from "../lib/api";

function DashboardPage() {
  return <Dashboard />;
}

function MeuDiaPage() {
  return <MyDay />;
}

function CalendarioPage() {
  return <Calendar />;
}

function RotinasPage() {
  return <Routines />;
}

function MetasPage() {
  return <Goals />;
}

function LembretesPage() {
  return <Reminders />;
}

function TrabalhoPage() {
  return <Work />;
}

function InsightsPage() {
  return <Insights />;
}

function AppRoutes() {
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

  if (checkingSession) {
    return <div className="app-loading">Carregando sua sessão...</div>;
  }

  if (!user) {
    return <Login onAuthenticated={setUser} />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meu-dia" element={<MeuDiaPage />} />
        <Route path="/replanejamento" element={<Replanning />} />

        <Route
          path="/rotinas/treino-da-manha"
          element={<RoutineDetail />}
        />

        <Route
          path="/metas/crescimento-profissional"
          element={<GoalDetail />}
        />

        <Route
          path="/metas/crescimento-profissional/planejamento"
          element={<GoalPlanning />}
        />

        <Route path="/imprevistos" element={<Incidents />} />
        <Route path="/notificacoes" element={<Notifications />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/rotinas" element={<RotinasPage />} />
        <Route path="/metas" element={<MetasPage />} />
        <Route path="/lembretes" element={<LembretesPage />} />
        <Route path="/trabalho" element={<TrabalhoPage />} />
        <Route path="/insights" element={<InsightsPage />} />

        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Route>
    </Routes>
  );
}

export default AppRoutes;