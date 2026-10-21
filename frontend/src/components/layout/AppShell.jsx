import { Outlet } from "react-router-dom";

import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileNavigation from "./MobileNavigation";
import HydrationAlarm from './HydrationAlarm';
import { UserPreferencesProvider } from '../../lib/UserPreferences';
import { NotificationFeedbackProvider } from '../../lib/NotificationFeedback';
import NotificationToasts from './NotificationToasts';

function AppShell({ onLogout }) {
  return (
    <UserPreferencesProvider><NotificationFeedbackProvider><div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <Header onLogout={onLogout} />
        <HydrationAlarm />

        <main className="app-content">
          <Outlet />
        </main>

        <MobileNavigation />
        <NotificationToasts />
      </div>
    </div></NotificationFeedbackProvider></UserPreferencesProvider>
  );
}

export default AppShell;
