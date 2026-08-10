import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-placeholder">
      <span className="placeholder-badge">✓ </span>
      <h1 className="placeholder-title">Welcome to your Notes Workspace!</h1>
      <p className="placeholder-desc">
      </p>


    </div>
  );
};
