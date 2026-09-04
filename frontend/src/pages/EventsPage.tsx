import PlaceholderView from '../components/PlaceholderView';

export default function EventsPage() {
  return (
    <div className="page-container">
      <PlaceholderView
        title="Surveillance Event Journal"
        subtitle="Historical audit log of security events, motion detections, and system changes"
        icon="📋"
        moduleKey="events"
        description="Centralized temporal record preserving chronological surveillance actions, camera reconnect events, and perimeter activity logs."
        integrationNotes={[
          'Audit log pagination and sector-based query filters',
          'Exportable CSV / JSON evidentiary reports for defense authorities',
          'Timeline correlation between adjacent camera sectors',
        ]}
      />
    </div>
  );
}
