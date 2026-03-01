import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// PrimeReact core styles (theme CSS is swapped dynamically by ThemeContext)
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

// Custom theme variables & component overrides (loaded after PrimeReact
// so [data-theme] variable bridges beat PrimeReact's :root definitions)
import "./styles/themes.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
