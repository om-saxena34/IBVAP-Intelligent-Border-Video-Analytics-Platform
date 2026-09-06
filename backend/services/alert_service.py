from __future__ import annotations

from datetime import datetime
from threading import Lock
from typing import Dict, List, Optional

from backend.models.alert import (
    Alert,
    AlertStatus,
    CreateAlertRequest,
    Severity,
)


class AlertService:
    """Thread-safe service responsible for managing system alerts."""

    def __init__(self) -> None:
        self._alerts: Dict[int, Alert] = {}
        self._next_id: int = 1
        self._lock = Lock()

    def create_alert(
        self,
        request: CreateAlertRequest,
    ) -> Alert:
        """Create and store a new active alert."""

        with self._lock:
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
        """Return all alerts, newest first."""

        with self._lock:
            return list(
                reversed(
                    list(self._alerts.values())
                )
            )

    def get_active_alerts(self) -> List[Alert]:
        """Return only currently active alerts."""

        with self._lock:
            return [
                alert
                for alert in reversed(
                    list(self._alerts.values())
                )
                if alert.status == AlertStatus.ACTIVE
            ]

    def get_resolved_alerts(self) -> List[Alert]:
        """Return resolved alerts."""

        with self._lock:
            return [
                alert
                for alert in reversed(
                    list(self._alerts.values())
                )
                if alert.status == AlertStatus.RESOLVED
            ]

    def get_alert(
        self,
        alert_id: int,
    ) -> Optional[Alert]:
        """Return one alert by ID."""

        with self._lock:
            return self._alerts.get(alert_id)

    def resolve_alert(
        self,
        alert_id: int,
    ) -> Optional[Alert]:
        """Mark an alert as resolved."""

        with self._lock:
            alert = self._alerts.get(alert_id)

            if alert is None:
                return None

            alert.status = AlertStatus.RESOLVED

            return alert

    def get_total_alerts(self) -> int:
        """Return total number of alerts."""

        with self._lock:
            return len(self._alerts)

    def get_active_alert_count(self) -> int:
        """Return the number of currently active alerts."""

        with self._lock:
            return sum(
                1
                for alert in self._alerts.values()
                if alert.status == AlertStatus.ACTIVE
            )

    def get_resolved_alert_count(self) -> int:
        """Return the number of resolved alerts."""

        with self._lock:
            return sum(
                1
                for alert in self._alerts.values()
                if alert.status == AlertStatus.RESOLVED
            )

    def get_critical_alert_count(self) -> int:
        """Return number of active CRITICAL alerts."""

        with self._lock:
            return sum(
                1
                for alert in self._alerts.values()
                if (
                    alert.status == AlertStatus.ACTIVE
                    and alert.severity == Severity.CRITICAL
                )
            )

    def get_high_alert_count(self) -> int:
        """Return number of active HIGH alerts."""

        with self._lock:
            return sum(
                1
                for alert in self._alerts.values()
                if (
                    alert.status == AlertStatus.ACTIVE
                    and alert.severity == Severity.HIGH
                )
            )

    def clear(self) -> None:
        """Clear all alerts. Primarily useful for tests."""

        with self._lock:
            self._alerts.clear()
            self._next_id = 1


alert_service = AlertService()