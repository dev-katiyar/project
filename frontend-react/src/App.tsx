import React from "react";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { StockSymbolProvider } from "@/contexts/StockSymbolContext";
import router from "./router";

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StockSymbolProvider>
          <RouterProvider router={router} />
        </StockSymbolProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
