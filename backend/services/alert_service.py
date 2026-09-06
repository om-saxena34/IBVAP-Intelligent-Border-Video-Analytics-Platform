from datetime import datetime
from typing import Dict, List, Optional

from backend.models.alert import (
    Alert,
    AlertStatus,
    CreateAlertRequest,
    Severity,
)


class AlertService:
    """Service responsible for managing system alerts."""

    def __init__(self):
        self._alerts: Dict[int, Alert] = {}
        self._next_id: int = 1

    def create_alert(self, request: CreateAlertRequest) -> Alert:
        """Create and store a new alert."""
        alert_time = request.timestamp or datetime.now()

        alert = Alert(
            id=self._next_id,
            camera_id=request.camera_id,
            event_type=request.event_type,
            severity=request.severity,
            status=request.status or AlertStatus.ACTIVE,
            confidence=request.confidence if request.confidence is not None else 0.92,
            timestamp=alert_time,
            details=request.details,
        )

        self._alerts[self._next_id] = alert
        self._next_id += 1

        return alert

    def get_all_alerts(
        self,
        camera_id: Optional[str] = None,
        status: Optional[AlertStatus] = None,
        severity: Optional[Severity] = None,
    ) -> List[Alert]:
        """Return all alerts, with optional filtering."""
        results = list(self._alerts.values())
        if camera_id:
            results = [a for a in results if a.camera_id == camera_id]
        if status:
            results = [a for a in results if a.status == status]
        if severity:
            results = [a for a in results if a.severity == severity]
        return results

    def get_alert(self, alert_id: int) -> Optional[Alert]:
        """Return one alert."""
        return self._alerts.get(alert_id)

    def resolve_alert(self, alert_id: int) -> Optional[Alert]:
        """Mark an alert as resolved."""
        alert = self._alerts.get(alert_id)
        if not alert:
            return None

        alert.status = AlertStatus.RESOLVED
        return alert

    def get_total_alerts(self) -> int:
        """Return total number of alerts."""
        return len(self._alerts)

    def get_active_alerts_count(self) -> int:
        """Return total number of currently ACTIVE alerts."""
        return sum(1 for a in self._alerts.values() if a.status == AlertStatus.ACTIVE)

    def clear(self) -> None:
        """Clear all alerts (used in tests)."""
        self._alerts.clear()
        self._next_id = 1


alert_service = AlertService()