import { useState } from 'react';

export default function SettingsPage() {
  // Local persistence of operational settings
  const [telemetryInterval, setTelemetryInterval] = useState<number>(() => {
    return Number(localStorage.getItem('forge_telemetry_interval') || 2500);
  });

  const [defaultStreamMode, setDefaultStreamMode] = useState<string>(() => {
    return localStorage.getItem('forge_default_stream_mode') || 'live';
  });

  const [aiOverlayDefault, setAiOverlayDefault] = useState<boolean>(() => {
    return localStorage.getItem('forge_ai_overlay_default') !== 'false';
  });

  const [alertAudioEnabled, setAlertAudioEnabled] = useState<boolean>(() => {
    return localStorage.getItem('forge_alert_audio') === 'true';
  });

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(() => {
    return Number(localStorage.getItem('forge_confidence_threshold') || 0.5);
  });

  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleSave = () => {
    localStorage.setItem('forge_telemetry_interval', String(telemetryInterval));
    localStorage.setItem('forge_default_stream_mode', defaultStreamMode);
    localStorage.setItem('forge_ai_overlay_default', String(aiOverlayDefault));
    localStorage.setItem('forge_alert_audio', String(alertAudioEnabled));
    localStorage.setItem('forge_confidence_threshold', String(confidenceThreshold));

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleReset = () => {
    setTelemetryInterval(2500);
    setDefaultStreamMode('live');
    setAiOverlayDefault(true);
    setAlertAudioEnabled(false);
    setConfidenceThreshold(0.5);

    localStorage.removeItem('forge_telemetry_interval');
    localStorage.removeItem('forge_default_stream_mode');
    localStorage.removeItem('forge_ai_overlay_default');
    localStorage.removeItem('forge_alert_audio');
    localStorage.removeItem('forge_confidence_threshold');

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="page-container settings-page-forge">
      {/* Header Bar */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator" />
          <div>
            <h2 className="section-heading font-display">Mission Platform Preferences & Controls</h2>
            <span className="section-caption font-mono">
              STATION CONFIGURATION // TELEMETRY RATES // INFERENCE SENSITIVITY
            </span>
          </div>
        </div>

        <div className="header-action-buttons font-mono">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            Reset Defaults
          </button>
          <button type="button" className="btn btn-primary btn-sm btn-forge-deploy" onClick={handleSave}>
            Save Preferences
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="backend-offline-banner font-mono mb-4" style={{ borderColor: 'var(--accent-warm)' }}>
          <span className="banner-icon">✓</span>
          <span>Operational settings updated and applied to browser station memory.</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Section 1: Ingestion & Telemetry Pacing */}
        <div className="tactical-panel-card border-tactical">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-tag font-mono">INGESTION & DATA RATE</span>
              <h3 className="panel-title">Telemetry & Polling Pacing</h3>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-group mb-3">
              <label className="font-mono text-xs text-muted block mb-1">
                TELEMETRY REFRESH INTERVAL (BROWSER WORKER POLLING):
              </label>
              <select
                className="forge-select font-mono w-full"
                value={telemetryInterval}
                onChange={(e) => setTelemetryInterval(Number(e.target.value))}
              >
                <option value={1200}>1.2s — High Performance (Fast Local Network)</option>
                <option value={2500}>2.5s — Balanced Command Rate (Recommended)</option>
                <option value={5000}>5.0s — Low Bandwidth / Power Saver</option>
              </select>
              <span className="text-muted text-xs font-mono mt-1 block">
                Controls how frequently detection bounding boxes, threat scores, and health telemetry are queried.
              </span>
            </div>

            <div className="form-group mb-3">
              <label className="font-mono text-xs text-muted block mb-1">
                DEFAULT CAMERA VIEWPORT MODE:
              </label>
              <select
                className="forge-select font-mono w-full"
                value={defaultStreamMode}
                onChange={(e) => setDefaultStreamMode(e.target.value)}
              >
                <option value="live">Continuous MJPEG Live Streaming (Instantaneous)</option>
                <option value="snapshot">Forensic Snapshot Polling (Bandwidth & Socket Efficient)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: AI Analytics & Overlay Settings */}
        <div className="tactical-panel-card border-tactical">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-tag font-mono">VISION INFERENCE</span>
              <h3 className="panel-title">AI Overlays & Confidence Thresholds</h3>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-group mb-3">
              <label className="font-mono text-xs text-muted block mb-1">
                CONFIDENCE SCORE THRESHOLD: <strong className="text-cream">{(confidenceThreshold * 100).toFixed(0)}%</strong>
              </label>
              <input
                type="range"
                min="0.20"
                max="0.90"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-rust)' }}
              />
              <span className="text-muted text-xs font-mono mt-1 block">
                Targets detected below this confidence score are suppressed in threat telemetry.
              </span>
            </div>

            <div className="form-group mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiOverlayDefault}
                  onChange={(e) => setAiOverlayDefault(e.target.checked)}
                  style={{ accentColor: 'var(--brand-rust)', width: '16px', height: '16px' }}
                />
                <div>
                  <strong className="text-cream text-sm font-sans block">Render AI Overlays by Default</strong>
                  <span className="text-muted text-xs font-mono">
                    Draw YOLO bounding boxes, class labels, and virtual tripwires directly onto camera canvases.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Notification & Threat Audio */}
        <div className="tactical-panel-card border-tactical">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-tag font-mono">THREAT ESCALATION</span>
              <h3 className="panel-title">Audible Alert Signaling</h3>
            </div>
          </div>
          <div className="panel-body">
            <div className="form-group mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertAudioEnabled}
                  onChange={(e) => setAlertAudioEnabled(e.target.checked)}
                  style={{ accentColor: 'var(--brand-rust)', width: '16px', height: '16px' }}
                />
                <div>
                  <strong className="text-cream text-sm font-sans block">Audible Siren on Critical Perimeter Breach</strong>
                  <span className="text-muted text-xs font-mono">
                    Play a discrete acoustic pulse when a CRITICAL threat or tripwire breach is confirmed.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Operational Platform Identity */}
        <div className="tactical-panel-card border-tactical">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-tag font-mono">STATION IDENTITY</span>
              <h3 className="panel-title">C2 Station Specifications</h3>
            </div>
          </div>
          <div className="panel-body font-mono text-xs">
            <div className="detection-row">
              <span className="text-muted">SYSTEM DESIGNATION:</span>
              <strong className="text-cream">IBVAP — FORGE COMMAND v2.4</strong>
            </div>
            <div className="detection-row">
              <span className="text-muted">THEME ARCHITECTURE:</span>
              <strong className="text-rust">Industrial Rust / Warm Charcoal (#111111)</strong>
            </div>
            <div className="detection-row">
              <span className="text-muted">OPERATIONAL SECTOR:</span>
              <strong className="text-cream">SECTOR-01 // ALPHA PERIMETER</strong>
            </div>
            <div className="detection-row">
              <span className="text-muted">BACKEND GATEWAY:</span>
              <strong className="text-green">http://127.0.0.1:8000 (FastAPI Async)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
