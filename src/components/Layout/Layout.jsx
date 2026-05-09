import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Briefcase, Users, MessageSquareText, LogOut, Loader2, User } from 'lucide-react';

const Layout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="app-layout animate-fade-in">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <Briefcase color="var(--accent-primary)" size={28} />
            Workly
          </div>
          
          <nav className="nav-links" style={{ marginTop: '3rem' }}>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              <span>Главная</span>
            </NavLink>
            <NavLink to="/vacancies" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Briefcase size={20} />
              <span>Вакансии</span>
            </NavLink>
            <NavLink to="/candidates" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              <span>Кандидаты</span>
            </NavLink>
            <NavLink to="/messages" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <MessageSquareText size={20} />
              <span>Сообщения</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <User size={20} />
              <span>Профиль</span>
            </NavLink>
          </nav>
        </div>

        <button 
          onClick={handleLogout} 
          className="nav-link" 
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: 'auto' }}
        >
          <LogOut size={20} color="var(--accent-primary)" />
          <span style={{ color: 'var(--accent-primary)' }}>Выйти</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content glass-panel" style={{ margin: '1rem', borderRadius: 'var(--radius-lg)' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
