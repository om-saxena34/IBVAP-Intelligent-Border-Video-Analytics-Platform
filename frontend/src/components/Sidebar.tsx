import { NavLink } from 'react-router-dom';
import { useHealth } from '../hooks/useHealth';

interface SidebarProps {
  onOpenConnectModal?: () => void;
}

export default function Sidebar({ onOpenConnectModal }: SidebarProps) {
  const { health, loading, error } = useHealth(8000);

  const isOnline = Boolean(health && !error && health.status === 'healthy');

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-badge">
          <div className="radar-circle" />
          <span className="brand-code">DEF-AI</span>
        </div>
        <div className="brand-text">
          <h1 className="brand-title">IBVAP</h1>
          <p className="brand-subtitle">Border Surveillance</p>
        </div>
      </div>

      {/* Surveillance Tagline */}
      <div className="sidebar-classification">
        <span className="classification-pill">SECURE // RESTRICTED</span>
        <span className="platform-tag">SIH-2026 // C2 COMMAND</span>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">OPERATIONS</div>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">⛯</span>
          <span className="nav-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/cameras"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">📹</span>
          <span className="nav-label">Live Cameras</span>
          {health && health.online_cameras > 0 && (
            <span className="nav-counter count-active">{health.online_cameras}</span>
          )}
        </NavLink>

        <NavLink
          to="/alerts"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">⚡</span>
          <span className="nav-label">Alerts</span>
          <span className="nav-counter count-na">N/A</span>
        </NavLink>

        <NavLink
          to="/events"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">Events</span>
          <span className="nav-counter count-na">N/A</span>
        </NavLink>

        <div className="nav-section-label">ANALYTICS & SYSTEM</div>
        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Analytics</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">⚙</span>
          <span className="nav-label">Settings</span>
        </NavLink>
      </nav>

      {/* Quick Action */}
      {onOpenConnectModal && (
        <div className="sidebar-action">
          <button
            type="button"
            className="btn btn-primary btn-block btn-tactical"
            onClick={onOpenConnectModal}
          >
            <span>+</span> Connect Camera
          </button>
        </div>
      )}

      {/* System Status Footer */}
      <div className="sidebar-footer">
        <div className="system-status-card">
          <div className="status-row">
            <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`} />
            <div className="status-meta">
              <div className="status-heading">
                {loading
                  ? 'Checking System...'
                  : isOnline
                  ? 'System Online'
                  : 'System Offline'}
              </div>
              <div className="status-subtext">
                {loading
                  ? 'Querying /health'
                  : isOnline
                  ? 'Backend operational'
                  : 'Backend unavailable'}
              </div>
            </div>
          </div>

          <div className="status-details">
            <div className="detail-item">
              <span className="detail-key">VERSION</span>
              <span className="detail-val">{health?.version || 'v1.0.0'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-key">CAMERAS</span>
              <span className="detail-val">
                {health ? `${health.online_cameras}/${health.total_cameras}` : '0/0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
