import PlaceholderView from '../components/PlaceholderView';

export default function SettingsPage() {
  return (
    <div className="page-container">
      <PlaceholderView
        title="Platform Settings & Configuration"
        subtitle="Hardware acceleration, storage paths, and inference model thresholds"
        icon="⚙"
        moduleKey="settings"
        description="System configuration interface for CUDA GPU acceleration, storage retention policies, RTSP stream buffer limits, and network proxies."
        integrationNotes={[
          'Inference device selection (NVIDIA CUDA / TensorRT / OpenVINO / CPU)',
          'Stream worker reconnect backoff and timeout parameters',
          'Encrypted credential management for RTSP authentication',
        ]}
      />
    </div>
  );
}
