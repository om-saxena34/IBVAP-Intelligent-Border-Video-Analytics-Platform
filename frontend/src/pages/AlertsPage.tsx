import PlaceholderView from '../components/PlaceholderView';

export default function AlertsPage() {
  return (
    <div className="page-container">
      <PlaceholderView
        title="Perimeter Threat Alerts"
        subtitle="Real-time border intrusion alerts, tripwire breaches, and tactical anomalies"
        icon="⚡"
        moduleKey="alerts"
        description="The automated threat detection engine dispatches prioritized notifications when AI models detect unauthorized crossing, lingering, or vehicular intrusions."
        integrationNotes={[
          'WebSocket subscription endpoint (/ws/alerts) for sub-second alert push',
          'Classification confidence threshold filtering (Low / Med / Critical)',
          'Video clip bookmarking and snapshot forensic tagging',
          'Multi-agency operator escalation workflow',
        ]}
      />
    </div>
  );
}
