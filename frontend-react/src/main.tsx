import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Styles — themes.css holds CSS vars + minimal custom classes; rest is PrimeFlex
import "./styles/themes.css";

// PrimeReact theme & core (imported here so Vite bundles them)
import "primereact/resources/themes/lara-dark-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
