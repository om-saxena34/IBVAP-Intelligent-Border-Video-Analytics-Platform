export interface CapabilityItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'Ready for Integration' | 'Planned';
  icon: string;
}

const CAPABILITIES: CapabilityItem[] = [
  {
    id: 'human-detection',
    name: 'Human Detection',
    category: 'Computer Vision',
    description:
      'Perimeter pedestrian and trespasser tracking using lightweight YOLO models for visible and infrared spectrums.',
    status: 'Ready for Integration',
    icon: '👤',
  },
  {
    id: 'vehicle-detection',
    name: 'Vehicle Detection',
    category: 'Perimeter Defense',
    description:
      'Identification and trajectory estimation of unauthorized border vehicles, convoys, and off-road mobility assets.',
    status: 'Ready for Integration',
    icon: '🚗',
  },
  {
    id: 'face-detection',
    name: 'Face Detection',
    category: 'Biometrics',
    description:
      'Checkpoint biometric capture and facial matching against verified security watchlists and alert databases.',
    status: 'Planned',
    icon: '🎯',
  },
  {
    id: 'anpr',
    name: 'ANPR',
    category: 'Traffic Intelligence',
    description:
      'Automatic Number Plate Recognition with optical character classification in multi-angle border check lanes.',
    status: 'Planned',
    icon: '🔢',
  },
  {
    id: 'virtual-fence',
    name: 'Virtual Fence',
    category: 'Geofencing',
    description:
      'Configurable polyline tripwires and sterile zones triggering immediate alarms upon cross-boundary breach.',
    status: 'Ready for Integration',
    icon: '⚡',
  },
  {
    id: 'suspicious-activity',
    name: 'Suspicious Activity',
    category: 'Behavioral AI',
    description:
      'Detection of erratic movement, prolonged loitering, crawling postures, and abandoned objects along fences.',
    status: 'Ready for Integration',
    icon: '⚠️',
  },
  {
    id: 'night-movement',
    name: 'Night Movement',
    category: 'Thermal & Low-Light',
    description:
      'High-contrast motion enhancement and thermal sensor fusion for zero-lux nocturnally hostile terrain surveillance.',
    status: 'Ready for Integration',
    icon: '🌙',
  },
  {
    id: 'realtime-alerts',
    name: 'Real-time Alerts',
    category: 'Tactical C2',
    description:
      'Low-latency alert dispatch pipeline delivering prioritized telemetry to command post personnel and field patrols.',
    status: 'Ready for Integration',
    icon: '🚨',
  },
];

export default function CapabilityGrid() {
  return (
    <div className="capabilities-section">
      <div className="section-header">
        <div className="header-title-group">
          <span className="section-tag">AI INFERENCE STACK</span>
          <h3 className="section-title">Integrated Video Analytics Capabilities</h3>
          <p className="section-subtitle">
            Edge-deployable deep learning modules architecture. Backend analytics pipeline integration in progress.
          </p>
        </div>
      </div>

      <div className="capabilities-grid">
        {CAPABILITIES.map((cap) => {
          const isReady = cap.status === 'Ready for Integration';
          return (
            <div
              key={cap.id}
              className={`capability-card ${
                isReady ? 'cap-ready' : 'cap-planned'
              }`}
            >
              <div className="capability-top">
                <div className="capability-icon">{cap.icon}</div>
                <span
                  className={`capability-status-pill ${
                    isReady ? 'pill-ready' : 'pill-planned'
                  }`}
                >
                  <span className="status-bullet" />
                  {cap.status}
                </span>
              </div>

              <h4 className="capability-name">{cap.name}</h4>
              <span className="capability-category">{cap.category}</span>
              <p className="capability-desc">{cap.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
