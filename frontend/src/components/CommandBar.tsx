import { useState, useEffect } from 'react';
import type { SystemHealth } from '../api/healthApi';

interface CommandBarProps {
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onOpenConnectModal?: () => void;
  onOpenCommandPalette?: () => void;
}

export default function CommandBar({
  health,
  loading,
  error,
  onRefresh,
  onOpenConnectModal,
  onOpenCommandPalette,
}: CommandBarProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      setUtcTime(
        `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')} UTC`
      );
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = Boolean(
    health && !error && health.status?.toLowerCase() === 'healthy'
  );

  return (
    <header className="forge-command-bar">
      {/* Left: Sector & Operation Status */}
      <div className="cmd-bar-left">
        <div className="cmd-callsign font-display">
          <span>FORGE</span>
          <span className="cmd-slash">/</span>
          <span className="cmd-node">C2-MONITOR</span>
        </div>
        <div className="cmd-sector-tag font-mono">
          SECTOR-01 // ALPHA PERIMETER
        </div>
      </div>

      {/* Center: Mission Clocks & Quick Command trigger */}
      <div className="cmd-bar-center">
        <div className="cmd-clock-cluster font-mono">
          <span className="clock-local" title="Local System Time">{currentTime}</span>
          <span className="clock-sep">|</span>
          <span className="clock-utc" title="Coordinated Universal Time">{utcTime}</span>
        </div>

        {onOpenCommandPalette && (
          <button
            type="button"
            className="cmd-palette-trigger font-mono"
            onClick={onOpenCommandPalette}
            title="Open Command Palette (Ctrl+K)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search or jump...</span>
            <kbd className="cmd-kbd">⌘K</kbd>
          </button>
        )}
      </div>

      {/* Right: Operational Status & Deploy Action */}
      <div className="cmd-bar-right">
        {/* Stream Health Status Pill */}
        <div
          className={`cmd-health-pill ${isHealthy ? 'healthy' : 'degraded'}`}
          title={isHealthy ? 'FastAPI Ingestion Gateway Operational' : error || 'Gateway Offline'}
        >
          <span className="pill-beacon" />
          <span className="pill-text font-mono">
            {loading ? 'SYNCING...' : isHealthy ? 'ONLINE' : 'OFFLINE'}
          </span>
          {onRefresh && (
            <button
              type="button"
              className="cmd-refresh-btn"
              onClick={onRefresh}
              title="Refresh System Health"
            >
              ↻
            </button>
          )}
        </div>

        {/* Active Nodes Metric */}
        <div className="cmd-node-metric font-mono" title="Connected Cameras (Online / Total)">
          <span className="node-icon">📹</span>
          <span className="node-count">
            {health ? `${health.online_cameras}/${health.total_cameras}` : '0/0'}
          </span>
          <span className="node-label">NODES</span>
        </div>

        {/* Deploy Camera Action */}
        {onOpenConnectModal && (
          <button
            type="button"
            className="btn btn-primary btn-sm btn-forge-deploy"
            onClick={onOpenConnectModal}
          >
            <span className="deploy-icon">+</span>
            <span>Connect Feed</span>
          </button>
        )}
      </div>
    </header>
  );
}
