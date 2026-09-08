import { useState, type FormEvent, useEffect, type ChangeEvent, useRef } from 'react';
import {
  streamsApi,
  type StreamConnectRequest,
  type StreamSourceType,
} from '../api/streamsApi';

interface ConnectCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cameraId: string) => void;
}

interface SelectedFileInfo {
  name: string;
  sizeFormatted: string;
  extension: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ConnectCameraModal({
  isOpen,
  onClose,
  onSuccess,
}: ConnectCameraModalProps) {
  const [cameraId, setCameraId] = useState('');
  const [sourceType, setSourceType] = useState<StreamSourceType>('FILE');
  const [sourceUrl, setSourceUrl] = useState('');
  const [location, setLocation] = useState('');
  const [sector, setSector] = useState('');
  const [loopVideo, setLoopVideo] = useState(true);

  // Selected file details
  const [selectedFile, setSelectedFile] = useState<SelectedFileInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Webcam device index
  const [webcamIndex, setWebcamIndex] = useState('0');

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize defaults on source type switch
  const handleSourceTypeChange = (type: StreamSourceType) => {
    setSourceType(type);
    setErrorMessage(null);
    if (type === 'FILE') {
      if (selectedFile) {
        setSourceUrl(selectedFile.name);
      }
    } else if (type === 'WEBCAM') {
      setSourceUrl(webcamIndex);
    } else if (type === 'RTSP' && (sourceUrl === '0' || sourceUrl === '1' || sourceUrl.endsWith('.mp4'))) {
      setSourceUrl('');
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  // Handle local video file picker with automatic backend upload
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toUpperCase() || 'VIDEO';
    setSelectedFile({
      name: file.name,
      sizeFormatted: formatBytes(file.size),
      extension: ext,
    });
    setErrorMessage(null);

    // Automatically upload file to backend so OpenCV worker can access it immediately
    setIsUploading(true);
    try {
      const uploadRes = await streamsApi.uploadVideo(file);
      if (uploadRes.ok && uploadRes.data?.file_path) {
        setSourceUrl(uploadRes.data.file_path);
        if (!cameraId) {
          const autoId = `CAM-${file.name.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 10).toUpperCase()}`;
          setCameraId(autoId);
        }
      } else {
        // Fallback to filename relative path
        setSourceUrl(`samples/${file.name}`);
      }
    } catch {
      setSourceUrl(`samples/${file.name}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUsePrimaryCctvSample = () => {
    setSourceType('FILE');
    setSourceUrl('samples/Sample for CCTV.mp4');
    setSelectedFile({
      name: 'Sample for CCTV.mp4',
      sizeFormatted: '1.2 MB',
      extension: 'MP4',
    });
    setCameraId('CAM-CCTV-01');
    setLocation('Border Gate Bravo (Highway)');
    setSector('Sector 02 - Roadway');
    setLoopVideo(true);
    setErrorMessage(null);
  };

  const handleUseSecondarySample = () => {
    setSourceType('FILE');
    setSourceUrl('samples/test_border_feed.mp4');
    setSelectedFile({
      name: 'test_border_feed.mp4',
      sizeFormatted: '80.0 KB',
      extension: 'MP4',
    });
    setCameraId('CAM-001');
    setLocation('Border Checkpoint Alpha');
    setSector('Sector 04');
    setLoopVideo(true);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedId = cameraId.trim();
    const finalUrl = sourceType === 'WEBCAM' ? webcamIndex.trim() : sourceUrl.trim();

    if (!trimmedId) {
      setErrorMessage('Camera ID is required. Example: CAM-CCTV-01');
      return;
    }
    if (!finalUrl) {
      setErrorMessage(
        sourceType === 'FILE'
          ? 'Please select or enter an MP4/video file path.'
          : sourceType === 'WEBCAM'
          ? 'Please select a webcam device index.'
          : 'Source URL is required.'
      );
      return;
    }

    setLoading(true);

    const payload: StreamConnectRequest = {
      camera_id: trimmedId,
      source_type: sourceType,
      source_url: finalUrl,
      location: location.trim() || undefined,
      sector: sector.trim() || undefined,
      loop_video: sourceType === 'FILE' ? loopVideo : false,
    };

    try {
      const res = await streamsApi.connectStream(payload);
      if (res.ok) {
        setSuccessMessage('Camera connected and AI pipeline initialized successfully');
        setTimeout(() => {
          setCameraId('');
          setSourceUrl('');
          setLocation('');
          setSector('');
          setSelectedFile(null);
          setSuccessMessage(null);
          onSuccess(trimmedId);
          onClose();
        }, 500);
      } else {
        setErrorMessage(res.error || 'Failed to connect camera stream.');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-tag font-mono">IBVAP // STREAM INGESTION</span>
            <h2 id="modal-title" className="modal-title">
              Connect Camera &amp; AI Pipeline
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tactical Fast-Demo Preset Bar */}
        <div className="demo-preset-banner">
          <span className="demo-preset-label font-mono">⚡ QUICK DEMO PRESETS:</span>
          <div className="demo-preset-buttons">
            <button
              type="button"
              className="btn btn-sm btn-accent-crimson"
              onClick={handleUsePrimaryCctvSample}
              disabled={loading}
              title="Auto-fill with primary test video (Sample for CCTV.mp4)"
            >
              ★ Load Primary CCTV (Sample for CCTV.mp4)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleUseSecondarySample}
              disabled={loading}
              title="Auto-fill with synthetic checkpoint video"
            >
              Load Secondary Feed (test_border_feed)
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="modal-alert-error" role="alert">
            <span className="alert-icon">⚠</span>
            <span className="alert-text">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="modal-alert-success" role="status">
            <span className="alert-icon">✓</span>
            <span className="alert-text">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            {/* Camera ID */}
            <div className="form-group">
              <label htmlFor="cam-id" className="form-label">
                Camera Callsign / ID <span className="req">*</span>
              </label>
              <input
                id="cam-id"
                type="text"
                className="form-input font-mono"
                placeholder="Example: CAM-CCTV-01"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
              <span className="form-hint">Unique tactical identifier</span>
            </div>

            {/* Source Type Selector */}
            <div className="form-group">
              <label htmlFor="cam-type" className="form-label">
                Ingestion Source <span className="req">*</span>
              </label>
              <select
                id="cam-type"
                className="form-select font-mono"
                value={sourceType}
                onChange={(e) => handleSourceTypeChange(e.target.value as StreamSourceType)}
                disabled={loading}
              >
                <option value="FILE">FILE (CCTV / Recorded MP4)</option>
                <option value="RTSP">RTSP (CCTV / IP Security Camera)</option>
                <option value="WEBCAM">WEBCAM (Hardware USB Device)</option>
              </select>
              <span className="form-hint">Video feed protocol</span>
            </div>
          </div>

          {/* FILE Source Configuration */}
          {sourceType === 'FILE' && (
            <div className="file-source-panel">
              <label className="form-label">
                Select CCTV Video File <span className="req">*</span>
              </label>

              {/* Native file picker hidden trigger */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.avi,.mov,.mkv,.webm"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={loading || isUploading}
              />

              <div className="file-picker-row">
                <button
                  type="button"
                  className="btn btn-secondary file-select-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || isUploading}
                >
                  {isUploading ? '⏳ Uploading Video to Backend...' : '📁 Upload CCTV File (.mp4, .avi, .mov)'}
                </button>
              </div>

              {/* Selected file summary card */}
              {selectedFile && (
                <div className="selected-file-card">
                  <div className="file-meta-icon">🎥</div>
                  <div className="file-meta-details">
                    <div className="file-meta-name font-mono">{selectedFile.name}</div>
                    <div className="file-meta-sub">
                      <span>Size: {selectedFile.sizeFormatted}</span>
                      <span className="file-format-badge">{selectedFile.extension}</span>
                      {isUploading && <span className="uploading-tag">UPLOADING...</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="file-clear-btn"
                    onClick={() => {
                      setSelectedFile(null);
                      setSourceUrl('');
                    }}
                    title="Clear selected file"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Source Path Input */}
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label htmlFor="cam-file-path" className="form-label">
                  File Path (relative to project root or uploaded path) <span className="req">*</span>
                </label>
                <input
                  id="cam-file-path"
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. samples/Sample for CCTV.mp4"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          )}

          {/* RTSP Source Configuration */}
          {sourceType === 'RTSP' && (
            <div className="form-group">
              <label htmlFor="cam-rtsp-url" className="form-label">
                RTSP Stream URL <span className="req">*</span>
              </label>
              <input
                id="cam-rtsp-url"
                type="text"
                className="form-input font-mono"
                placeholder="Example: rtsp://admin:password@192.168.1.100:554/live"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={loading}
                required
              />
              <span className="form-hint">
                Standard RTSP network stream address (H.264 / H.265)
              </span>
            </div>
          )}

          {/* WEBCAM Source Configuration */}
          {sourceType === 'WEBCAM' && (
            <div className="form-group">
              <label htmlFor="cam-webcam" className="form-label">
                Webcam / Device Index <span className="req">*</span>
              </label>
              <div className="webcam-selector-group">
                <select
                  id="cam-webcam"
                  className="form-select font-mono"
                  value={webcamIndex}
                  onChange={(e) => {
                    setWebcamIndex(e.target.value);
                    setSourceUrl(e.target.value);
                  }}
                  disabled={loading}
                >
                  <option value="0">Default Device (Index 0)</option>
                  <option value="1">Secondary USB Camera (Index 1)</option>
                  <option value="2">Tertiary Device (Index 2)</option>
                </select>
                <input
                  type="text"
                  className="form-input font-mono device-custom-input"
                  placeholder="Custom device index (e.g. 0)"
                  value={webcamIndex}
                  onChange={(e) => {
                    setWebcamIndex(e.target.value);
                    setSourceUrl(e.target.value);
                  }}
                  disabled={loading}
                  title="Or type custom device index"
                />
              </div>
            </div>
          )}

          <div className="form-grid">
            {/* Location */}
            <div className="form-group">
              <label htmlFor="cam-location" className="form-label">
                Perimeter Location
              </label>
              <input
                id="cam-location"
                type="text"
                className="form-input"
                placeholder="Example: Border Gate Bravo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
              <span className="form-hint">Physical surveillance post</span>
            </div>

            {/* Sector */}
            <div className="form-group">
              <label htmlFor="cam-sector" className="form-label">
                Defense Sector
              </label>
              <input
                id="cam-sector"
                type="text"
                className="form-input"
                placeholder="Example: Sector 02"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={loading}
              />
              <span className="form-hint">Tactical command zone</span>
            </div>
          </div>

          {/* Loop Video Checkbox */}
          {sourceType === 'FILE' && (
            <div className="form-checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={loopVideo}
                  onChange={(e) => setLoopVideo(e.target.checked)}
                  disabled={loading}
                />
                <span>Continuously loop video playback for persistent surveillance demo</span>
              </label>
            </div>
          )}

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-tactical"
              disabled={loading || isUploading}
            >
              {loading ? 'Initializing Stream...' : 'Connect & Activate AI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
