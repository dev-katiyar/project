import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import SettingsPanel from "./SettingsPanel";

/**
 * Shell layout: Header + Content (via <Outlet />) + Footer
 * Settings panel slides from the right.
 */
const Layout: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex flex-column min-h-screen">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="flex-1">
        <div className="sv-layout-wrap w-full mx-auto p-3">
          <Outlet />
        </div>
      </main>

      <Footer />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Layout;
