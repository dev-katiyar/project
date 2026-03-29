import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";
import StockDetailPanel from "@/components/stock/StockDetailPanel";
import { useStockSymbol } from "@/contexts/StockSymbolContext";

const StockDetailDialog: React.FC = () => {
  const { dialogSymbol, closeStockDialog } = useStockSymbol();
  const navigate = useNavigate();

  const handleOpenFullPage = () => {
    if (dialogSymbol) {
      navigate(`/overview-stock?symbol=${encodeURIComponent(dialogSymbol)}`);
      closeStockDialog();
    }
  };

  const headerContent = (
    <div className="flex align-items-center gap-2">
      <i className="pi pi-chart-bar sv-text-accent" />
      <span>Stock Details</span>
      <Button
        label="Open full page"
        icon="pi pi-external-link"
        size="small"
        className="p-button-text p-button-sm ml-2"
        onClick={handleOpenFullPage}
        tooltip="Open in full Stock Summary page"
        tooltipOptions={{ position: "bottom" }}
      />
    </div>
  );

  return (
    <Dialog
      visible={dialogSymbol !== null}
      onHide={closeStockDialog}
      header={headerContent}
      style={{ width: "90vw", maxWidth: 1200 }}
      maximizable
      modal
      dismissableMask
      pt={{
        root: { className: "sv-stock-dialog" },
        content: { style: { padding: 0 } },
      }}
    >
      {dialogSymbol && (
        <StockDetailPanel
          symbol={dialogSymbol}
          onSymbolChange={(s) => {
            // keep dialog open but reflect new symbol in URL if user searches within dialog
            navigate(`/overview-stock?symbol=${encodeURIComponent(s)}`, { replace: true });
          }}
        />
      )}
    </Dialog>
  );
};

export default StockDetailDialog;
