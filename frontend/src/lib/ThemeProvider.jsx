import { useEffect, useState } from 'react';
import { ThemeContext } from './theme';
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
      const appearance = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = appearance;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content',
        appearance === 'dark' ? '#151719' : '#F2F3F5',
      );
    };
    apply();
    try { localStorage.setItem(key, theme); } catch { /* The theme still works without storage. */ }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
