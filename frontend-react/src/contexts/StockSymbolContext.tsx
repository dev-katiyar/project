import React, { createContext, useContext, useState } from "react";

interface StockSymbolContextValue {
  dialogSymbol: string | null;
  openStockDialog: (symbol: string) => void;
  closeStockDialog: () => void;
}

const StockSymbolContext = createContext<StockSymbolContextValue | null>(null);

export const StockSymbolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogSymbol, setDialogSymbol] = useState<string | null>(null);

  return (
    <StockSymbolContext.Provider
      value={{
        dialogSymbol,
        openStockDialog: (symbol) => setDialogSymbol(symbol.toUpperCase()),
        closeStockDialog: () => setDialogSymbol(null),
      }}
    >
      {children}
    </StockSymbolContext.Provider>
  );
};

export const useStockSymbol = (): StockSymbolContextValue => {
  const ctx = useContext(StockSymbolContext);
  if (!ctx) throw new Error("useStockSymbol must be used within StockSymbolProvider");
  return ctx;
};
