import { Outlet } from "react-router-dom";

import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileNavigation from "./MobileNavigation";
import HydrationAlarm from './HydrationAlarm';
import { UserPreferencesProvider } from '../../lib/UserPreferences';

function AppShell({ onLogout }) {
  return (
    <UserPreferencesProvider><div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <Header onLogout={onLogout} />
        <HydrationAlarm />

        <main className="app-content">
          <Outlet />
        </main>

        <MobileNavigation />
      </div>
    </div></UserPreferencesProvider>
  );
}

export default AppShell;
