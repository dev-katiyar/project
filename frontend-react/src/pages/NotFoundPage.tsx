import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-8 px-2">
      <h1 className="text-7xl font-bold mb-2 sv-text-accent">404</h1>
      <p className="text-lg mb-4 text-color-secondary">
        Page not found
      </p>
      <Button
        label="Go Home"
        className="p-button-primary"
        onClick={() => navigate("/")}
      />
    </div>
  );
};

export default NotFoundPage;
