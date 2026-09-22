import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useHealth } from '../hooks/useHealth';
import { useAlerts } from '../hooks/useAlerts';
import { useEvents } from '../hooks/useEvents';

interface NavigationRailProps {
  onOpenConnectModal: () => void;
  onOpenCommandPalette?: () => void;
}

export default function NavigationRail({
  onOpenConnectModal,
}: NavigationRailProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const { health, loading: healthLoading, error: healthError } = useHealth(8000);
  const { activeCount: activeAlertsCount } = useAlerts(4000);
  const { events } = useEvents(4000);

  const isHealthy = Boolean(
    health && !healthError && health.status?.toLowerCase() === 'healthy'
  );

  const navItems = [
    {
      to: '/',
      label: 'Overview',
      code: 'OVW',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      to: '/surveillance',
      label: 'Live Operations',
      code: 'OPS',
      badge: 'LIVE',
      badgeClass: 'badge-rust',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      ),
    },
    {
      to: '/cameras',
      label: 'Camera Nodes',
      code: 'NOD',
      badge: health && health.online_cameras > 0 ? `${health.online_cameras}` : undefined,
      badgeClass: 'badge-success',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
    },
    {
      to: '/analytics',
      label: 'Intelligence',
      code: 'INT',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M18 9l-5 5-4-4-4 5" />
        </svg>
      ),
    },
    {
      to: '/zones',
      label: 'Perimeter Zones',
      code: 'ZON',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      to: '/alerts',
      label: 'Threat Alerts',
      code: 'ALT',
      badge: activeAlertsCount > 0 ? `${activeAlertsCount}` : undefined,
      badgeClass: 'badge-critical',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      to: '/events',
      label: 'Event Log',
      code: 'EVT',
      badge: events.length > 0 ? `${events.length}` : undefined,
      badgeClass: 'badge-muted',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      to: '/health',
      label: 'System Diagnostics',
      code: 'SYS',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
    },
    {
      to: '/settings',
      label: 'Platform Settings',
      code: 'CFG',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className={`forge-rail ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      aria-label="Mission Navigation Rail"
    >
      {/* Brand Glyphs */}
      <div className="rail-brand-zone">
        <div className="rail-brand-icon-box">
          <div className="brand-crest">
            <span className="brand-letter font-display">F</span>
          </div>
          <span className={`brand-status-pip ${isHealthy ? 'pip-online' : 'pip-critical'}`} />
        </div>
        {isExpanded && (
          <div className="rail-brand-copy">
            <span className="brand-title font-display">IBVAP</span>
            <span className="brand-sub font-mono">FORGE C2</span>
          </div>
        )}
      </div>

      {/* Primary Navigation Items */}
      <div className="rail-nav-list">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `rail-nav-link ${isActive ? 'active' : ''}`}
            title={!isExpanded ? item.label : undefined}
          >
            <div className="rail-icon-wrap">
              {item.icon}
            </div>
            {isExpanded && (
              <div className="rail-link-text">
                <span className="rail-label">{item.label}</span>
                <span className="rail-code font-mono">{item.code}</span>
              </div>
            )}
            {item.badge && (
              <span className={`rail-badge ${item.badgeClass || 'badge-rust'} font-mono`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Action Footprint */}
      <div className="rail-foot-zone">
        <button
          type="button"
          className="rail-connect-btn"
          onClick={onOpenConnectModal}
          title="Connect Camera Feed"
        >
          <span className="connect-plus">+</span>
          {isExpanded && <span className="connect-label">Connect Feed</span>}
        </button>

        {isExpanded && (
          <div className="rail-diagnostics font-mono">
            <span className="diag-label">SYSTEM</span>
            <span className="diag-val">
              {healthLoading ? 'INIT' : isHealthy ? 'STABLE' : 'DEGRADED'}
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}
