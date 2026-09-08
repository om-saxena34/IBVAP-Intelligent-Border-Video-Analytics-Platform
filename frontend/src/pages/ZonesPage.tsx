import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStreams } from '../hooks/useStreams';
import { zonesApi, streamsApi, type ZoneConfig } from '../api/client';

interface ZonesPageProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export default function ZonesPage({ onNotify }: ZonesPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { streams, loading: streamsLoading } = useStreams(6000);

  const cameraQuery = searchParams.get('camera');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Zone coordinates form state
  const [fenceX1, setFenceX1] = useState<number>(340);
  const [fenceY1, setFenceY1] = useState<number>(150);
  const [fenceX2, setFenceX2] = useState<number>(340);
  const [fenceY2, setFenceY2] = useState<number>(650);

  // Restricted zone rectangle (x1, y1, x2, y2)
  const [zoneX1, setZoneX1] = useState<number>(180);
  const [zoneY1, setZoneY1] = useState<number>(260);
  const [zoneX2, setZoneX2] = useState<number>(360);
  const [zoneY2, setZoneY2] = useState<number>(500);

  const [minLoiteringSec, setMinLoiteringSec] = useState<number>(5.0);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(3);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewKey, setPreviewKey] = useState<number>(Date.now());

  // Select initial camera
  useEffect(() => {
    if (streams.length > 0) {
      if (cameraQuery && streams.some((s) => s.camera_id === cameraQuery)) {
        setSelectedCameraId(cameraQuery);
      } else if (!selectedCameraId) {
        const firstOnline = streams.find((s) => s.status === 'ONLINE') || streams[0];
        setSelectedCameraId(firstOnline.camera_id);
        setSearchParams({ camera: firstOnline.camera_id });
      }
    }
  }, [streams, cameraQuery, selectedCameraId, setSearchParams]);

  // Load existing zone configuration for selected camera
  const loadZones = useCallback(async (camId: string) => {
    if (!camId) return;
    try {
      const res = await zonesApi.getCameraZones(camId);
      if (res.ok && res.data) {
        const d = res.data;
        if (d.virtual_fence && d.virtual_fence.length >= 2) {
          setFenceX1(d.virtual_fence[0][0]);
          setFenceY1(d.virtual_fence[0][1]);
          setFenceX2(d.virtual_fence[1][0]);
          setFenceY2(d.virtual_fence[1][1]);
        }
        if (d.restricted_zone && d.restricted_zone.length >= 4) {
          const xs = d.restricted_zone.map((p: number[]) => p[0]);
          const ys = d.restricted_zone.map((p: number[]) => p[1]);
          setZoneX1(Math.min(...xs));
          setZoneY1(Math.min(...ys));
          setZoneX2(Math.max(...xs));
          setZoneY2(Math.max(...ys));
        }
        if (d.min_loitering_seconds) {
          setMinLoiteringSec(d.min_loitering_seconds);
        }
        if (d.max_group_size) {
          setMaxGroupSize(d.max_group_size);
        }
      }
    } catch {
      // Soft fail
    }
  }, []);

  useEffect(() => {
    if (selectedCameraId) {
      void loadZones(selectedCameraId);
    }
  }, [selectedCameraId, loadZones]);

  const handleCameraChange = (camId: string) => {
    setSelectedCameraId(camId);
    setSearchParams({ camera: camId });
    setPreviewKey(Date.now());
  };

  const handleApplyPrimaryPreset = () => {
    setFenceX1(340);
    setFenceY1(150);
    setFenceX2(340);
    setFenceY2(650);

    setZoneX1(180);
    setZoneY1(260);
    setZoneX2(360);
    setZoneY2(500);

    setMinLoiteringSec(5.0);
    setMaxGroupSize(3);
    onNotify('Loaded preset coordinates for "Sample for CCTV.mp4". Click "Apply Changes".', 'success');
  };

  const handleApplyPerimeterWidePreset = () => {
    setFenceX1(240);
    setFenceY1(100);
    setFenceX2(240);
    setFenceY2(750);

    setZoneX1(120);
    setZoneY1(200);
    setZoneX2(400);
    setZoneY2(600);

    setMinLoiteringSec(4.0);
    setMaxGroupSize(2);
    onNotify('Loaded Wide Perimeter Preset. Click "Apply Changes" to save.', 'success');
  };

  const handleSaveZones = async () => {
    if (!selectedCameraId) {
      onNotify('Select a camera first.', 'error');
      return;
    }

    setIsSaving(true);
    const config: ZoneConfig = {
      virtual_fence: [
        [fenceX1, fenceY1],
        [fenceX2, fenceY2],
      ],
      restricted_zone: [
        [zoneX1, zoneY1],
        [zoneX2, zoneY1],
        [zoneX2, zoneY2],
        [zoneX1, zoneY2],
      ],
      min_loitering_seconds: minLoiteringSec,
      max_group_size: maxGroupSize,
    };

    try {
      const res = await zonesApi.updateCameraZones(selectedCameraId, config);
      if (res.ok) {
        onNotify(`Zones updated successfully for ${selectedCameraId}.`, 'success');
        setPreviewKey(Date.now());
      } else {
        onNotify(res.error || 'Failed to update zones.', 'error');
      }
    } catch {
      onNotify('An error occurred while saving zones.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeStream = streams.find((s) => s.camera_id === selectedCameraId);
  const liveUrl = selectedCameraId
    ? `${streamsApi.getLiveStreamUrl(selectedCameraId, true)}&_t=${previewKey}`
    : '';

  return (
    <div className="page-container zones-page">
      {/* Header */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator" />
          <div>
            <h2 className="section-heading">Border Zones &amp; Virtual Fence Configuration</h2>
            <span className="section-caption font-mono">
              DYNAMIC PERIMETER GEOMETRY &amp; AI TRIPWIRE CALIBRATION
            </span>
          </div>
        </div>

        <div className="camera-switcher-wrap">
          <label className="font-mono text-xs text-muted">TARGET NODE:</label>
          <select
            className="form-select font-mono"
            value={selectedCameraId}
            onChange={(e) => handleCameraChange(e.target.value)}
            disabled={streamsLoading || streams.length === 0}
          >
            {streams.length === 0 ? (
              <option value="">No Streams Available</option>
            ) : (
              streams.map((s) => (
                <option key={s.camera_id} value={s.camera_id}>
                  {s.camera_id} ({s.status})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="demo-preset-banner">
        <span className="demo-preset-label font-mono">⚡ QUICK ZONE PRESETS:</span>
        <div className="demo-preset-buttons">
          <button
            type="button"
            className="btn btn-sm btn-accent-crimson"
            onClick={handleApplyPrimaryPreset}
          >
            ★ Sample for CCTV Preset (Fence x=340, Zone [180,260..360,500])
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={handleApplyPerimeterWidePreset}
          >
            Wide Perimeter Flank (Fence x=240, Zone [120,200..400,600])
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, Live Preview Right */}
      <div className="surveillance-main-grid">
        {/* Left: Zone Calibration Form */}
        <div className="tactical-panel-card border-tactical">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-tag font-mono">CALIBRATION ENGINE</span>
              <h3 className="panel-title">Tripwire &amp; Polygon Geometry</h3>
            </div>
            <span className="badge badge-cyan font-mono">LIVE UPDATE</span>
          </div>

          <div className="panel-body">
            {/* Virtual Fence Line Form */}
            <div className="zone-subgroup">
              <h4 className="zone-subheading font-mono text-cyan">
                1. VIRTUAL FENCE TRIPWIRE ((X1, Y1) → (X2, Y2))
              </h4>
              <p className="text-xs text-muted">
                Detections crossing this line trigger immediate <code>virtual_fence_crossing</code> alerts.
              </p>
              <div className="form-grid-4">
                <div className="form-group">
                  <label className="form-label font-mono text-xs">Point 1 X</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={fenceX1}
                    onChange={(e) => setFenceX1(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-mono text-xs">Point 1 Y</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={fenceY1}
                    onChange={(e) => setFenceY1(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-mono text-xs">Point 2 X</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={fenceX2}
                    onChange={(e) => setFenceX2(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-mono text-xs">Point 2 Y</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={fenceY2}
                    onChange={(e) => setFenceY2(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Restricted Zone Polygon Form */}
            <div className="zone-subgroup mt-4">
              <h4 className="zone-subheading font-mono text-crimson">
                2. RESTRICTED SECURITY PERIMETER ([X_MIN, Y_MIN] → [X_MAX, Y_MAX])
              </h4>
              <p className="text-xs text-muted">
                Unauthorized targets entering this bounding polygon trigger <code>restricted_zone_entry</code>.
              </p>
              <div className="form-grid-4">
                <div className="form-group">
                  <label className="form-label font-mono text-xs">Left (X Min)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={zoneX1}
                    onChange={(e) => setZoneX1(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-mono text-xs">Top (Y Min)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={zoneY1}
                    onChange={(e) => setZoneY1(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-mono text-xs">Right (X Max)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={zoneX2}
                    onChange={(e) => setZoneX2(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-mono text-xs">Bottom (Y Max)</label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={zoneY2}
                    onChange={(e) => setZoneY2(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Behavioral Thresholds */}
            <div className="zone-subgroup mt-4">
              <h4 className="zone-subheading font-mono text-amber">
                3. BEHAVIORAL THREAT THRESHOLDS
              </h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label font-mono text-xs">
                    Loitering Dwell Time Threshold (seconds)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input font-mono"
                    value={minLoiteringSec}
                    onChange={(e) => setMinLoiteringSec(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-mono text-xs">
                    Group Movement Trigger (person count)
                  </label>
                  <input
                    type="number"
                    className="form-input font-mono"
                    value={maxGroupSize}
                    onChange={(e) => setMaxGroupSize(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="panel-actions mt-4">
              <button
                type="button"
                className="btn btn-primary btn-tactical"
                onClick={handleSaveZones}
                disabled={isSaving || !selectedCameraId}
              >
                {isSaving ? 'Applying to Engine...' : '⚡ Apply & Sync to Analytics Engine'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real-Time Live Feed Preview */}
        <div className="surveillance-viewport-panel border-tactical">
          <div className="monitor-top-ribbon">
            <span className="font-mono text-xs text-bold">
              LIVE OVERLAY VERIFICATION // {selectedCameraId || 'NO CHANNEL'}
            </span>
            <span className="font-mono text-xs text-cyan">
              CYAN = FENCE // CRIMSON = RESTRICTED ZONE
            </span>
          </div>

          <div className="monitor-canvas-container" style={{ minHeight: '400px' }}>
            {activeStream?.status === 'ONLINE' ? (
              <div className="monitor-img-wrapper">
                <img
                  src={liveUrl}
                  alt="Live Zone Preview"
                  className="monitor-stream-image"
                />
              </div>
            ) : (
              <div className="offline-feed-pattern monitor-offline">
                <div className="pattern-status">
                  <span className="pattern-code font-mono">FEED STANDBY</span>
                  <span className="pattern-desc">
                    Connect camera to preview calibrated zone overlays in real-time.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="monitor-bottom-hud">
            <div className="hud-telemetry-right font-mono text-xs">
              <span>FENCE: ({fenceX1},{fenceY1})→({fenceX2},{fenceY2})</span>
              <span>ZONE: [{zoneX1},{zoneY1}..{zoneX2},{zoneY2}]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
