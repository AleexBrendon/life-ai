import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const key = 'lifeai:appearance';
function savedTheme() {
  try { const value = localStorage.getItem(key); return ['light', 'dark', 'system'].includes(value) ? value : 'dark'; }
  catch { return 'dark'; }
}
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(savedTheme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };
    apply();
    try { localStorage.setItem(key, theme); } catch { /* The theme still works without storage. */ }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
