import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-placeholder">
      <span className="placeholder-badge">✓ Workspace Active</span>
      <h1 className="placeholder-title">
        Welcome{user?.name ? `, ${user.name}` : ''}!
      </h1>
      <p className="placeholder-desc">
        {user?.email ? `Logged in as ${user.email}. ` : ''}Your Notes App dashboard is ready.
      </p>
    </div>
  );
};
