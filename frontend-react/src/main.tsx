import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Styles
import "./styles/themes.css";
import "./styles/layout.css";

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
