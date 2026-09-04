export default function AlertPanel() {
  return (
    <div className="alert-panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-tag">INTELLIGENCE FEED</span>
          <h3 className="panel-title">Recent Border Alerts</h3>
        </div>
        <div className="panel-badge-group">
          <span className="badge badge-amber">
            <span className="dot amber" />
            API Offline
          </span>
          <span className="count-pill">0 ACTIVE</span>
        </div>
      </div>

      {/* Empty State designed for future integration */}
      <div className="alert-panel-body">
        <div className="alert-empty-state">
          <div className="alert-empty-icon">🛡</div>
          <h4 className="alert-empty-title">No alert data available</h4>
          <p className="alert-empty-text">
            Alert detection API will appear here when integrated.
          </p>
          <div className="alert-api-notice">
            <span className="notice-icon">ℹ</span>
            <span>
              Real-time threat detection telemetry pipeline pending backend event streaming (WebSocket / SSE).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
