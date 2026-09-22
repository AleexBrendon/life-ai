import { Outlet } from "react-router-dom";

import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileNavigation from "./MobileNavigation";

function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <Header />

        <main className="app-content">
          <Outlet />
        </main>

        <MobileNavigation />
      </div>
    </div>
  );
}

export default AppShell;