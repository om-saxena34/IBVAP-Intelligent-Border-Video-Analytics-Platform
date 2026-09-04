import { useStreams } from '../hooks/useStreams';
import { useHealth } from '../hooks/useHealth';
import CameraGrid from '../components/CameraGrid';

interface LiveCamerasPageProps {
  onOpenConnectModal: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export default function LiveCamerasPage({
  onOpenConnectModal,
  onNotify,
}: LiveCamerasPageProps) {
  const { streams, loading, error, refresh: refreshStreams } = useStreams(4000);
  const { refresh: refreshHealth } = useHealth(8000);

  const handleDisconnected = (cameraId: string) => {
    onNotify(`Camera "${cameraId}" disconnected.`, 'success');
    refreshStreams();
    refreshHealth();
  };

  return (
    <div className="page-container">
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator" />
          <div>
            <h3 className="section-heading">All Registered Border Cameras</h3>
            <span className="section-caption">
              Direct telemetry inspection, snapshot monitoring, and stream connection management
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-tactical btn-sm"
          onClick={onOpenConnectModal}
        >
          + Connect Camera
        </button>
      </div>

      {error && (
        <div className="modal-alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <CameraGrid
        streams={streams}
        loading={loading}
        onOpenConnectModal={onOpenConnectModal}
        onCameraDisconnected={handleDisconnected}
        onError={(err) => onNotify(err, 'error')}
        showFilters={true}
      />
    </div>
  );
}
