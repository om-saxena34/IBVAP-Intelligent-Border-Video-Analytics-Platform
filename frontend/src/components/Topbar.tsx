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
  const onlineCameras = health?.online_cameras ?? 0;
  const totalCameras = health?.total_cameras ?? 0;

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <div className="topbar-title-group">
          <div className="topbar-headline-row">
            <span className="topbar-callsign font-mono">IBVAP</span>
            <span className="topbar-divider">|</span>
            <h2 className="topbar-title">Intelligent Border Video Analytics Platform</h2>
          </div>
          <p className="topbar-subtitle">
            Autonomous Border Surveillance &amp; AI-Powered Threat Interdiction • SIH 2026
          </p>
        </div>
      </div>

      <div className="topbar-right">
        {/* System Status */}
        <div
          className={`topbar-status-pill ${
            isOnline ? 'pill-online' : 'pill-offline'
          }`}
          title={isOnline ? 'FastAPI Backend Operational' : error || 'Backend Offline'}
        >
          <span className="pill-dot" />
          <span className="pill-label">
            {loading ? 'CHECKING...' : isOnline ? 'SYSTEM OPERATIONAL' : 'SYSTEM OFFLINE'}
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

        {/* Active Cameras Count */}
        <div className="topbar-cameras-metric" title="Active Online Surveillance Channels">
          <span className="cameras-metric-icon">📹</span>
          <span className="cameras-metric-label">ACTIVE NODES:</span>
          <span className="cameras-metric-val font-mono">
            {onlineCameras}
            <span className="cameras-metric-total">/{totalCameras}</span>
          </span>
        </div>

        {/* Live Surveillance Beacon */}
        <div className="topbar-live-beacon">
          <span className="live-dot" />
          <span className="live-text">DEFENSE C2 ACTIVE</span>
        </div>

        {/* System Time */}
        <div className="topbar-clock" title="System Surveillance Time">
          <span className="clock-icon">🕒</span>
          <span className="clock-val font-mono">{timeString || 'SYNCHRONIZING...'}</span>
        </div>

        {/* Connect Camera Quick Button */}
        {onOpenConnectModal && (
          <button
            type="button"
            className="btn btn-sm btn-primary btn-tactical"
            onClick={onOpenConnectModal}
          >
            + Connect Camera
          </button>
        )}
      </div>
    </header>
  );
}
