import { NavLink } from "react-router-dom";

import { navigationItems } from "../../config/navigation";

function MobileNavigation() {
  const items = navigationItems.slice(0, 5);

  return (
    <nav className="mobile-navigation" aria-label="Navegação mobile">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mobile-navigation-item ${
                isActive ? "mobile-navigation-item-active" : ""
              }`
            }
          >
            <Icon size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MobileNavigation;