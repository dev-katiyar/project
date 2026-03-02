import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// PrimeReact core styles (theme CSS is swapped dynamically by ThemeContext)
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

// Theme variables ([data-theme] blocks + PrimeReact token bridges).
// Loaded after PrimeReact so our variable bridges override :root defaults.
import "./styles/themes.css";

// Non-theme global styles: resets, typography, scrollbar, PrimeReact
// brand overrides, and shared sv-* utility classes.
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
