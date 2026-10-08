import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ResultsPage has been unified into the canonical Today's Plan page (/today/plan).
 * This component cleanly redirects any legacy links to /today/plan.
 */
export const ResultsPage: React.FC = () => {
  return <Navigate to="/today/plan" replace />;
};
