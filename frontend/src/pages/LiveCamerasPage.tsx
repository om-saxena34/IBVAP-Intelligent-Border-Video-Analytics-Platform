import { useState } from 'react';
import { useStreams } from '../hooks/useStreams';
import { useHealth } from '../hooks/useHealth';
import CameraGrid from '../components/CameraGrid';
import VirtualFenceModal from '../components/VirtualFenceModal';

interface LiveCamerasPageProps {
  onOpenConnectModal: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export default function LiveCamerasPage({
  onOpenConnectModal,
  onNotify,
}: LiveCamerasPageProps) {
  const [isFenceModalOpen, setIsFenceModalOpen] = useState<boolean>(false);
  const [selectedCam, setSelectedCam] = useState<string>('CAM-001');

  const { streams, loading, error, refresh: refreshStreams } = useStreams(4000);
  const { refresh: refreshHealth } = useHealth(8000);

  const handleDisconnected = (cameraId: string) => {
    onNotify(`Camera "${cameraId}" disconnected.`, 'success');
    refreshStreams();
    refreshHealth();
  };

  const handleFenceEventTriggered = (eventType: string, camId: string) => {
    onNotify(`Border Intelligence: ${eventType.replace(/_/g, ' ')} detected on ${camId}`, 'success');
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
        <div className="header-action-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-tactical btn-sm"
            onClick={() => {
              setSelectedCam(streams[0]?.camera_id || 'CAM-001');
              setIsFenceModalOpen(true);
            }}
          >
            🛡 Virtual Fence Inspector
          </button>
          <button
            type="button"
            className="btn btn-primary btn-tactical btn-sm"
            onClick={onOpenConnectModal}
          >
            + Connect Camera
          </button>
        </div>
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

      {/* Virtual Fence Inspector Modal */}
      <VirtualFenceModal
        isOpen={isFenceModalOpen}
        onClose={() => setIsFenceModalOpen(false)}
        selectedCameraId={selectedCam}
        onTriggerEvent={handleFenceEventTriggered}
      />
    </div>
  );
}
