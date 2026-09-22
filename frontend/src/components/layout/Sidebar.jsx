import { NavLink } from "react-router-dom";

import {
  navigationItems,
  secondaryNavigationItems,
} from "../../config/navigation";

function NavigationItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `sidebar-nav-item ${isActive ? "sidebar-nav-item-active" : ""}`
      }
    >
      <Icon size={19} strokeWidth={2} />

      <span>{item.label}</span>
    </NavLink>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">L</div>

          <div className="sidebar-brand-text">
            <strong>LifeAI</strong>
            <span>Seu planejador pessoal</span>
          </div>
        </div>

        <nav className="sidebar-navigation" aria-label="Navegação principal">
          <div className="sidebar-section">
            <span className="sidebar-section-label">Principal</span>

            <div className="sidebar-navigation-list">
              {navigationItems.map((item) => (
                <NavigationItem key={item.path} item={item} />
              ))}
            </div>
          </div>
        </nav>

        <div className="sidebar-bottom">
          {secondaryNavigationItems.map((item) => (
            <NavigationItem key={item.path} item={item} />
          ))}

          <div className="sidebar-user">
            <div className="sidebar-user-avatar">AB</div>

            <div className="sidebar-user-info">
              <strong>Alex</strong>
              <span>Plano pessoal</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;