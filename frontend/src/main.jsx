import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ThemeProvider } from './lib/ThemeProvider';
import "./index.css";
import "./styles/app-theme.css";
import "./styles/studio.css";
import "./styles/appearance.css";
import "./styles/spacing.css";
import "./styles/scrollbars.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider><App /></ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

