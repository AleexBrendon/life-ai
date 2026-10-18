import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';
const Preferences = createContext({ user: null });
export function UserPreferencesProvider({ children }) {
 const [user, setUser] = useState(null);
 useEffect(() => {
  let active = true;
  const refresh = () => api.get('/users/me').then(response => { if (active) setUser(response.data.user); }).catch(() => {});
  refresh(); window.addEventListener('lifeai:profile-updated', refresh);
  return () => { active = false; window.removeEventListener('lifeai:profile-updated', refresh); };
 }, []);
 return <Preferences.Provider value={{ user }}>{children}</Preferences.Provider>;
}
export const useUserPreferences = () => useContext(Preferences);
export function UserAvatar({ className = '' }) {
 const { user } = useUserPreferences();
 const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'L';
 return <span className={`user-avatar ${className}`} aria-hidden="true">{user?.profile?.avatarData ? <img src={user.profile.avatarData} alt=""/> : initials}</span>;
}
