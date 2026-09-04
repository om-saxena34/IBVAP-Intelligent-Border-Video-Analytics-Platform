import { useState, useEffect } from 'react';
import type { SystemHealth } from '../api/healthApi';

interface TopbarProps {
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onOpenConnectModal?: () => void;
}

export default function Topbar({
  health,
  loading,
  error,
  onRefresh,
  onOpenConnectModal,
}: TopbarProps) {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isOnline = Boolean(health && !error && health.status === 'healthy');

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <div className="topbar-title-group">
          <h2 className="topbar-title">Intelligent Border Surveillance</h2>
          <p className="topbar-subtitle">
            Real-time monitoring &amp; AI-powered video analytics
          </p>
        </div>
      </div>

      <div className="topbar-right">
        {/* Live Broadcast Beacon */}
        <div className="topbar-live-beacon">
          <span className="live-dot" />
          <span className="live-text">LIVE SURVEILLANCE</span>
        </div>

        {/* System Time UTC */}
        <div className="topbar-clock" title="System Synchronization Time">
          <span className="clock-icon">🕒</span>
          <span className="clock-val">{timeString || 'SYNCHRONIZING...'}</span>
        </div>

        {/* Backend Status Pill */}
        <div
          className={`topbar-status-pill ${
            isOnline ? 'pill-online' : 'pill-offline'
          }`}
          title={isOnline ? 'FastAPI Backend Operational' : error || 'Backend Offline'}
        >
          <span className="pill-dot" />
          <span className="pill-label">
            {loading ? 'CHECKING...' : isOnline ? 'BACKEND 8000 OK' : 'BACKEND OFFLINE'}
          </span>
          {onRefresh && (
            <button
              type="button"
              className="pill-refresh"
              onClick={onRefresh}
              title="Refresh Health Status"
            >
              ↻
            </button>
          )}
        </div>

        {/* Connect Camera Quick Button */}
        {onOpenConnectModal && (
          <button
            type="button"
            className="btn btn-sm btn-accent-cyan"
            onClick={onOpenConnectModal}
          >
            + Connect Camera
          </button>
        )}

        {/* User / Operator Badge */}
        <div className="topbar-operator">
          <div className="operator-avatar">OP</div>
          <div className="operator-meta">
            <span className="operator-name">UNIT-COMMAND</span>
            <span className="operator-role">SECTOR 04</span>
          </div>
        </div>
      </div>
    </header>
  );
}
