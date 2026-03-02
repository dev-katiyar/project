import React from "react";
import { Card } from "primereact/card";
import { Link } from "react-router-dom";

interface DashboardCardProps {
  title: string;
  linkTo?: string;
  linkLabel?: string;
  minHeight?: number | string;
  children?: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  linkTo,
  linkLabel = "View Details",
  minHeight,
  children,
}) => {
  return (
    <Card className="h-full">
      <div
        className="flex align-items-center justify-content-between mb-3"
        style={{ minHeight: 0 }}
      >
        <span className="font-semibold">{title}</span>
        {linkTo && (
          <Link
            to={linkTo}
            className="text-sm">
            {linkLabel}
          </Link>
        )}
      </div>
      <div style={{ minHeight: minHeight ?? 200 }}>{children}</div>
    </Card>
  );
};

export default DashboardCard;
