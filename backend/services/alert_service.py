from datetime import datetime
from typing import Dict, List, Optional

from backend.models.alert import (
    Alert,
    AlertStatus,
    CreateAlertRequest,
)


class AlertService:
    """Service responsible for managing system alerts."""

    def __init__(self):
        self._alerts: Dict[int, Alert] = {}
        self._next_id: int = 1

    def create_alert(self, request: CreateAlertRequest) -> Alert:
        """Create and store a new alert."""

        alert = Alert(
            id=self._next_id,
            camera_id=request.camera_id,
            event_type=request.event_type,
            severity=request.severity,
            status=AlertStatus.ACTIVE,
            timestamp=datetime.now(),
        )

        self._alerts[self._next_id] = alert
        self._next_id += 1

        return alert

    def get_all_alerts(self) -> List[Alert]:
        """Return all alerts."""
        return list(self._alerts.values())

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
        

alert_service = AlertService()