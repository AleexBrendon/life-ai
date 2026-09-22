import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lifeai_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem("lifeai_token");
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (payload) => api.post("/auth/login", payload),
  register: (payload) => api.post("/auth/register", payload),
  me: () => api.get("/auth/me"),
};

export const lifeApi = {
  dashboard: () => api.get("/dashboard"),
  today: () => api.get("/day/today"),
  profile: () => api.get("/users/me"),
  updateProfile: (payload) => api.put("/users/me", payload),
  routines: () => api.get("/routines"),
  goals: () => api.get("/goals"),
  reminders: () => api.get("/reminders"),
  notifications: () => api.get("/notifications"),
  calendar: (date) => api.get("/calendar", { params: date ? { date } : undefined }),
};

export default api;
