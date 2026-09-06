import { useState, useEffect, useCallback, useRef } from 'react';
import { intelligenceApi, type ZoneConfig } from '../api/intelligenceApi';
import { streamsApi, type StreamInfo } from '../api/streamsApi';


interface VirtualFenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerEvent?: (eventType: string, cameraId: string) => void;
  selectedCameraId?: string;
}

export default function VirtualFenceModal({
  isOpen,
  onClose,
  onTriggerEvent,
  selectedCameraId = 'CAM-001',
}: VirtualFenceModalProps) {
  const [cameraId, setCameraId] = useState<string>(selectedCameraId);
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [zones, setZones] = useState<ZoneConfig[]>([]);
  const [loadingZones, setLoadingZones] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [lastBreachTime, setLastBreachTime] = useState<string | null>(null);
  const [activeBreachType, setActiveBreachType] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync selected camera ID when prop changes
  useEffect(() => {
    if (selectedCameraId) {
      setCameraId(selectedCameraId);
    }
  }, [selectedCameraId]);

  // Fetch registered streams for dropdown
  useEffect(() => {
    if (!isOpen) return;
    streamsApi.listStreams().then((res) => {
      if (res.ok && res.data) {
        setStreams(res.data);
      }
    });
  }, [isOpen]);

  // Fetch zones for current camera
  const loadZones = useCallback(async (cam: string) => {
    setLoadingZones(true);
    try {
      const res = await intelligenceApi.listZones(cam);
      if (res.ok && res.data) {
        setZones(res.data.zones);
      }
    } finally {
      setLoadingZones(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadZones(cameraId);
    }
  }, [isOpen, cameraId, loadZones]);

  // Load snapshot image for backdrop
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    let blobUrl: string | null = null;

    streamsApi.getSnapshotUrl(cameraId).then((res) => {
      if (!isCancelled && res.ok && res.data) {
        blobUrl = URL.createObjectURL(res.data);
        setSnapshotUrl(blobUrl);
      } else {
        setSnapshotUrl(null);
      }
    });

    return () => {
      isCancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, cameraId, lastBreachTime]);

  // Draw zones on canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // If no snapshot, draw tactical radar grid
    if (!snapshotUrl) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw configured zones
    zones.forEach((zone) => {
      if (!zone.is_active || zone.coordinates.length < 2) return;

      const isTripwire = zone.zone_type === 'tripwire';
      const color = zone.color || (isTripwire ? '#ef4444' : '#f59e0b');

      if (isTripwire && zone.coordinates.length >= 2) {
        const p1 = zone.coordinates[0];
        const p2 = zone.coordinates[1];
        const x1 = p1.x * width;
        const y1 = p1.y * height;
        const x2 = p2.x * width;
        const y2 = p2.y * height;

        // Draw laser tripwire line with glow
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Pulsating end node markers
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x1, y1, 6, 0, 2 * Math.PI);
        ctx.arc(x2, y2, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Label
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`⚡ ${zone.zone_name.toUpperCase()}`, x1 + 10, y1 - 8);
        ctx.restore();
      } else {
        // Polygon Restricted Zone
        ctx.save();
        ctx.beginPath();
        zone.coordinates.forEach((pt, idx) => {
          const px = pt.x * width;
          const py = pt.y * height;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();

        // Translucent fill
        ctx.fillStyle = 'rgba(245, 158, 11, 0.20)';
        ctx.fill();

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Label at first point
        const firstPt = zone.coordinates[0];
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(`🛑 ${zone.zone_name.toUpperCase()}`, firstPt.x * width + 8, firstPt.y * height - 8);
        ctx.restore();
      }
    });

    // Breach flash overlay if active
    if (activeBreachType) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, width, height);

      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ff4d4f';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ THREAT DETECTED: ${activeBreachType.replace(/_/g, ' ')}`, width / 2, 35);
      ctx.restore();
    }
  }, [zones, snapshotUrl, activeBreachType]);

  const handleSimulate = async (eventType: string) => {
    setSimulating(eventType);
    setActiveBreachType(eventType);
    try {
      const res = await intelligenceApi.simulateDetection({
        camera_id: cameraId,
        event_type: eventType,
      });

      if (res.ok) {
        setLastBreachTime(new Date().toLocaleTimeString());
        onTriggerEvent?.(eventType, cameraId);
      }
    } finally {
      setTimeout(() => {
        setSimulating(null);
        setTimeout(() => setActiveBreachType(null), 3000);
      }, 600);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container tactical-fence-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="fence-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-icon">🛡</div>
          <div>
            <h3 id="fence-modal-title" className="modal-title">
              Virtual Fence & Border Intelligence Inspector
            </h3>
            <p className="modal-subtitle">
              Configure perimeter tripwires, restricted zones, and simulate Phase 2 intelligence rules
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body fence-modal-grid">
          {/* Left Column: Canvas Viewport */}
          <div className="fence-viewport-col">
            <div className="camera-selector-bar">
              <label htmlFor="camera-select" className="camera-select-label">
                SELECT CAMERA:
              </label>
              <select
                id="camera-select"
                className="form-select font-mono"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
              >
                {streams.map((s) => (
                  <option key={s.camera_id} value={s.camera_id}>
                    {s.camera_id} ({s.location || s.source_type})
                  </option>
                ))}
                {streams.every((s) => s.camera_id !== 'CAM-001') && (
                  <option value="CAM-001">CAM-001 (Default North Perimeter)</option>
                )}
                {streams.every((s) => s.camera_id !== 'CAM-002') && (
                  <option value="CAM-002">CAM-002 (BOP Bravo Line)</option>
                )}
                {streams.every((s) => s.camera_id !== 'CAM_01') && (
                  <option value="CAM_01">CAM_01 (Post Alpha)</option>
                )}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => loadZones(cameraId)}
                disabled={loadingZones}
              >
                ↻ Refresh
              </button>
            </div>

            {/* Canvas Container */}
            <div className="fence-canvas-container">
              {snapshotUrl && (
                <img
                  src={snapshotUrl}
                  alt="Live Camera Snapshot"
                  className="fence-backdrop-img"
                />
              )}
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="fence-canvas-layer"
              />
              <div className="canvas-hud-overlay">
                <span className="hud-badge font-mono">
                  ● ACTIVE FENCE OVERLAY // {cameraId}
                </span>
                {lastBreachTime && (
                  <span className="hud-badge hud-breach font-mono">
                    ⚡ LAST EVENT: {lastBreachTime}
                  </span>
                )}
              </div>
            </div>

            {/* Zone Summary Chips */}
            <div className="active-zones-bar">
              <span className="zone-bar-title">CONFIGURED ZONES ({zones.length}):</span>
              <div className="zone-chips-list">
                {zones.map((z) => (
                  <span
                    key={z.zone_id}
                    className={`zone-chip ${z.zone_type === 'tripwire' ? 'tripwire' : 'restricted'}`}
                  >
                    {z.zone_type === 'tripwire' ? '⚡' : '🛑'} {z.zone_name} (
                    {z.coordinates.length} pts)
                  </span>
                ))}
                {zones.length === 0 && !loadingZones && (
                  <span className="zone-chip-empty">No zones configured for {cameraId}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Rule Simulation & Tests */}
          <div className="fence-rules-col">
            <h4 className="rules-heading">Phase 2 Rule Simulator</h4>
            <p className="rules-desc">
              Trigger detection rules on demand to evaluate tripwire breaches, loitering, nocturnal anomalies, and sequence correlation:
            </p>

            <div className="rule-buttons-grid">
              <button
                type="button"
                className="rule-sim-btn btn-danger"
                onClick={() => handleSimulate('VIRTUAL_FENCE_BREACH')}
                disabled={Boolean(simulating)}
              >
                <div className="rule-btn-header">
                  <span className="rule-icon">⚡</span>
                  <span className="rule-name">Virtual Fence Breach</span>
                </div>
                <span className="rule-sub">Tripwire crossing (HIGH Severity)</span>
              </button>

              <button
                type="button"
                className="rule-sim-btn btn-amber"
                onClick={() => handleSimulate('RESTRICTED_ZONE_ENTRY')}
                disabled={Boolean(simulating)}
              >
                <div className="rule-btn-header">
                  <span className="rule-icon">🛑</span>
                  <span className="rule-name">Restricted Zone Entry</span>
                </div>
                <span className="rule-sub">Point-in-polygon intrusion (HIGH Severity)</span>
              </button>

              <button
                type="button"
                className="rule-sim-btn btn-warning"
                onClick={() => handleSimulate('LOITERING')}
                disabled={Boolean(simulating)}
              >
                <div className="rule-btn-header">
                  <span className="rule-icon">⏳</span>
                  <span className="rule-name">Loitering Detection</span>
                </div>
                <span className="rule-sub">Dwell time exceeds threshold (MEDIUM/HIGH)</span>
              </button>

              <button
                type="button"
                className="rule-sim-btn btn-info"
                onClick={() => handleSimulate('UNUSUAL_MOVEMENT')}
                disabled={Boolean(simulating)}
              >
                <div className="rule-btn-header">
                  <span className="rule-icon">🔄</span>
                  <span className="rule-name">Unusual Movement</span>
                </div>
                <span className="rule-sub">Erratic speed / trajectory reversal</span>
              </button>

              <button
                type="button"
                className="rule-sim-btn btn-purple"
                onClick={() => handleSimulate('NIGHT_TIME_MOVEMENT')}
                disabled={Boolean(simulating)}
              >
                <div className="rule-btn-header">
                  <span className="rule-icon">🌙</span>
                  <span className="rule-name">Night-Time Movement</span>
                </div>
                <span className="rule-sub">Nocturnal risk window 22:00-05:00 (HIGH)</span>
              </button>

              <button
                type="button"
                className="rule-sim-btn btn-blue"
                onClick={() => handleSimulate('GROUP_MOVEMENT')}
                disabled={Boolean(simulating)}
              >
                <div className="rule-btn-header">
                  <span className="rule-icon">👥</span>
                  <span className="rule-name">Group Movement</span>
                </div>
                <span className="rule-sub">Cluster density ≥ 3 subjects (HIGH)</span>
              </button>

              <button
                type="button"
                className="rule-sim-btn btn-critical"
                onClick={() => handleSimulate('SUSPICIOUS_SEQUENCE')}
                disabled={Boolean(simulating)}
              >
                <div className="rule-btn-header">
                  <span className="rule-icon">🔗</span>
                  <span className="rule-name">Suspicious Sequence</span>
                </div>
                <span className="rule-sub">Multi-event correlation (CRITICAL Alert)</span>
              </button>
            </div>

            <div className="rule-note-box">
              <span className="note-icon">ℹ</span>
              <p>
                HIGH and CRITICAL detections feed directly into <code>GET /events</code> and automatically trigger live alerts in <code>GET /alerts</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
