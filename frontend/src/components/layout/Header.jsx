import {
  Bell,
  Menu,
  Search,
  Sun,
} from "lucide-react";

function Header() {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          type="button"
          className="header-icon-button header-mobile-menu"
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>
      </div>

      <div className="header-search">
        <Search size={18} />

        <input
          type="search"
          placeholder="Buscar..."
          aria-label="Buscar"
        />

        <kbd>⌘ K</kbd>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="header-icon-button"
          aria-label="Alternar tema"
        >
          <Sun size={19} />
        </button>

        <button
          type="button"
          className="header-icon-button header-notification"
          aria-label="Notificações"
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <button
          type="button"
          className="header-avatar"
          aria-label="Abrir perfil"
        >
          AB
        </button>
      </div>
    </header>
  );
}

export default Header;