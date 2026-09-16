import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>FundsWeb</h2>
          <span className="role-badge">{user?.role}</span>
        </div>

        <ul className="nav-links">
          <li>
            <NavLink to="/enquiries" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📋</span> Enquiries
            </NavLink>
          </li>
          <li>
            <NavLink to="/quotations" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">💰</span> Quotations
            </NavLink>
          </li>
          <li>
            <NavLink to="/sales-orders" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📦</span> Sales Orders
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
