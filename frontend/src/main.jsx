import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { FeedbackToastHost } from './components/FeedbackToast';
import { ThemeProvider } from './lib/ThemeProvider';
import "./index.css";
import "./styles/app-theme.css";
import "./styles/studio.css";
import "./styles/appearance.css";
import "./styles/spacing.css";
import "./styles/scrollbars.css";
import "./styles/feedback.css";
import "./styles/finance-bills.css";
import "./styles/ai-mvp.css";
import "./styles/date-time.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider><App /><FeedbackToastHost /></ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
import "./styles/routine-preview.css";
