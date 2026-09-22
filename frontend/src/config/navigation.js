import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleDot,
  Home,
  ListTodo,
  Repeat2,
  Settings,
} from "lucide-react";

export const navigationItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: Home,
  },
  {
    label: "Meu Dia",
    path: "/meu-dia",
    icon: ListTodo,
  },
  {
    label: "Calendário",
    path: "/calendario",
    icon: CalendarDays,
  },
  {
    label: "Rotinas",
    path: "/rotinas",
    icon: Repeat2,
  },
  {
    label: "Metas",
    path: "/metas",
    icon: CircleDot,
  },
  {
    label: "Lembretes",
    path: "/lembretes",
    icon: Bell,
  },
  {
    label: "Trabalho",
    path: "/trabalho",
    icon: BriefcaseBusiness,
  },
  {
    label: "Insights",
    path: "/insights",
    icon: BarChart3,
  },
];

export const secondaryNavigationItems = [
  {
    label: "Configurações",
    path: "/configuracoes",
    icon: Settings,
  },
];