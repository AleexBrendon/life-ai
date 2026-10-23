import axios from "axios";
import { actionFeedback, showFeedback } from './actionFeedback';

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
  (response) => {
    if (response.headers['x-activity-notification'] === 'created') window.dispatchEvent(new Event('lifeai:notifications-updated'));
    if (response.data?.success !== false) showFeedback(actionFeedback(response.config));
    const path=(response.config?.url||'').split('?')[0];
    if(response.data?.success!==false&&['post','put','patch'].includes(response.config?.method)&&/^\/(?:planner\/imprevistos|unexpected-events)(?:\/\d+)?\/?$/.test(path)){
      const data=response.data.data;const record=data?.unexpectedEvent||data?.event||data;
      if(record?.id&&record.date)window.dispatchEvent(new CustomEvent('lifeai:unexpected-saved',{detail:record}));
    }
    if(response.data?.success!==false&&/^\/ai\/setup\/\d+\/apply$/.test(path)&&response.data.data?.created?.some(row=>row.kind==='imprevistos')){
      const ids=new Set(response.data.data.created.filter(row=>row.kind==='imprevistos').map(row=>row.id));
      api.get('/planner/imprevistos').then(result=>{for(const record of result.data.filter(row=>ids.has(row.id)))window.dispatchEvent(new CustomEvent('lifeai:unexpected-saved',{detail:record}))}).catch(()=>{});
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem("lifeai_token");
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (payload) => api.post("/auth/login", payload),
  register: (payload) => api.post("/auth/register", payload),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout", {}, { timeout: 5000 }),
};

export const lifeApi = {
  dashboard: () => api.get("/dashboard"),
  today: () => api.get("/day/today"),
  profile: () => api.get("/users/me"),
  updateProfile: (payload) => api.put("/users/me", payload),

  routines: () => api.get("/routines"),
  createRoutine: (payload) => api.post("/routines", payload),

  routineSchedules: (routineId) =>
    api.get(`/routines/${routineId}/schedules`),

  createRoutineSchedule: (routineId, payload) =>
    api.post(`/routines/${routineId}/schedules`, payload),


  routineSchedules: (routineId) =>
    api.get(`/routines/${routineId}/schedules`),

  createRoutineSchedule: (routineId, payload) =>
    api.post(`/routines/${routineId}/schedules`, payload),


  deleteRoutine: (routineId) =>
    api.delete(`/routines/${routineId}`),

  goals: () => api.get("/goals"),
  goal: (id) => api.get(`/goals/${id}`),
  createGoal: (payload) => api.post("/goals", payload),
  updateGoal: (id, payload) => api.patch(`/goals/${id}`, payload),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  reminders: () => api.get("/reminders"),
  createReminder: (payload) => api.post("/reminders", payload),
  updateReminder: (id, payload) => api.put(`/reminders/${id}`, payload),
  deleteReminder: (id) => api.delete(`/reminders/${id}`),
  completeReminder: (id) => api.patch(`/reminders/${id}/complete`),
  activateReminder: (id) => api.patch(`/reminders/${id}/activate`),
  deactivateReminder: (id) => api.patch(`/reminders/${id}/deactivate`),

  reminderExecutions: () => api.get("/reminder-executions"),
  createReminderExecution: (payload) =>
    api.post("/reminder-executions", payload),
  completeReminderExecution: (id) =>
    api.patch(`/reminder-executions/${id}/complete`),
  markReminderExecutionAsMissed: (id) =>
    api.patch(`/reminder-executions/${id}/missed`),
  notifications: () => api.get("/notifications"),
  calendar: (date) =>
    api.get("/calendar", {
      params: date ? { date } : undefined,
    }),

  jobs: () => api.get("/jobs"),
  createJob: (payload) => api.post("/jobs", payload),
  updateJob: (id, payload) => api.patch(`/jobs/${id}`, payload),
  deleteJob: (id) => api.delete(`/jobs/${id}`),

  tasks: (jobId) => api.get(`/jobs/${jobId}/tasks`),

  createTask: (jobId, payload) =>
    api.post(`/jobs/${jobId}/tasks`, payload),

  updateTask: (jobId, taskId, payload) =>
    api.patch(`/jobs/${jobId}/tasks/${taskId}`, payload),

  deleteTask: (jobId, taskId) =>
    api.delete(`/jobs/${jobId}/tasks/${taskId}`),

  completeRoutineSchedule: (routineScheduleId, date) =>
    api.post(
      `/routine-executions/schedule/${routineScheduleId}/complete`,
      { date }
    ),
};

export default api;

