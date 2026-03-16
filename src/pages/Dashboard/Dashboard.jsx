import React from 'react';

const Dashboard = () => {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Overview of your recruitment progress</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2" style={{ marginTop: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Active Vacancies</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginTop: '0.5rem' }}>0</p>
        </div>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Total Candidates</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-secondary)', marginTop: '0.5rem' }}>0</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
