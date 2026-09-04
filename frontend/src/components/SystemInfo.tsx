import type { SystemHealth } from '../api/healthApi';

interface SystemInfoProps {
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

function formatUptime(seconds: number | undefined): string {
  if (seconds === undefined || isNaN(seconds)) return '0s';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function SystemInfo({
  health,
  loading,
  error,
  lastUpdated,
}: SystemInfoProps) {
  const isHealthy = Boolean(health && !error && health.status === 'healthy');

  return (
    <div className="system-info-card">
      <div className="system-info-header">
        <div className="system-info-title-group">
          <span className="info-tag">SYSTEM TELEMETRY</span>
          <h3 className="system-info-title">Platform Runtime Diagnostics</h3>
        </div>
        <div className="system-info-status">
          <span
            className={`badge ${
              isHealthy ? 'badge-online' : 'badge-error'
            }`}
          >
            <span className={`dot ${isHealthy ? 'online' : 'error'}`} />
            {loading
              ? 'Checking...'
              : isHealthy
              ? 'FastAPI Operational'
              : 'Connection Failure'}
          </span>
        </div>
      </div>

      <div className="system-metrics-grid">
        <div className="metric-box">
          <span className="metric-label">PLATFORM</span>
          <span className="metric-val" title={health?.platform || 'IBVAP Platform'}>
            {health?.platform ? 'IBVAP Defense Core' : 'N/A'}
          </span>
          <span className="metric-sub">FastAPI Engine</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">VERSION</span>
          <span className="metric-val font-mono">
            {health?.version || 'Unknown'}
          </span>
          <span className="metric-sub">Build release</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">SYSTEM UPTIME</span>
          <span className="metric-val font-mono">
            {health ? formatUptime(health.uptime_seconds) : 'N/A'}
          </span>
          <span className="metric-sub">Continuous session</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">BACKEND STATUS</span>
          <span className="metric-val status-text font-mono">
            {health?.status ? health.status.toUpperCase() : 'OFFLINE'}
          </span>
          <span className="metric-sub">Port 8000</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">REGISTERED CAMERAS</span>
          <span className="metric-val font-mono">
            {health?.total_cameras ?? 0}
          </span>
          <span className="metric-sub">Configured nodes</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">ACTIVE STREAMS</span>
          <span className="metric-val font-mono text-green">
            {health?.online_cameras ?? 0}
          </span>
          <span className="metric-sub">Streaming frames</span>
        </div>
      </div>

      <div className="system-info-footer">
        <span className="sync-note">
          Last health poll: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Awaiting sync...'}
        </span>
        <span className="endpoint-note">
          Verified source: <code className="endpoint-code">GET /health</code>
        </span>
      </div>
    </div>
  );
}
