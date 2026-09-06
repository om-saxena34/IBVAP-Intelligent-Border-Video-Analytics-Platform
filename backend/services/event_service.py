from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.models.alert import CreateAlertRequest, Severity
from backend.models.event import Event, CreateEventRequest
from backend.services.alert_service import alert_service


class EventService:
    """Service responsible for managing detected events."""

    def __init__(self):
        self._events: Dict[int, Event] = {}
        self._next_id: int = 1

    def create_event(self, request: CreateEventRequest) -> Event:
        """Create a new event. Generate an alert for HIGH and CRITICAL events."""
        event_time = request.timestamp or datetime.now()

        event = Event(
            id=self._next_id,
            camera_id=request.camera_id,
            event_type=request.event_type,
            severity=request.severity,
            confidence=request.confidence if request.confidence is not None else 0.92,
            timestamp=event_time,
            details=request.details,
        )

        self._events[self._next_id] = event
        self._next_id += 1

        # Alert Generation Rule:
        # HIGH and CRITICAL events automatically generate alerts.
        # LOW and MEDIUM remain events.
        if request.severity in [Severity.HIGH, Severity.CRITICAL]:
            alert_service.create_alert(
                CreateAlertRequest(
                    camera_id=request.camera_id,
                    event_type=request.event_type,
                    severity=request.severity,
                    confidence=event.confidence,
                    timestamp=event.timestamp,
                    details=event.details,
                )
            )

        return event

    def get_all_events(self, camera_id: Optional[str] = None) -> List[Event]:
        """Return all events, optionally filtered by camera_id."""
        if camera_id:
            return [e for e in self._events.values() if e.camera_id == camera_id]
        return list(self._events.values())

    def get_event(self, event_id: int) -> Optional[Event]:
        """Return a single event by ID."""
        return self._events.get(event_id)

    def get_recent_events_for_camera(
        self,
        camera_id: str,
        window_seconds: float = 60.0,
    ) -> List[Event]:
        """Return events recorded for a specific camera within the last N seconds."""
        now = datetime.now()
        recent = []
        for e in self._events.values():
            if e.camera_id == camera_id:
                # Handle offset-naive vs offset-aware datetime gracefully
                diff = (now - e.timestamp.replace(tzinfo=None) if e.timestamp.tzinfo else now - e.timestamp).total_seconds()
                if 0 <= diff <= window_seconds:
                    recent.append(e)
        return recent

    def get_total_events(self) -> int:
        """Return total number of events."""
        return len(self._events)

    def clear(self) -> None:
        """Clear all events (used in tests)."""
        self._events.clear()
        self._next_id = 1


event_service = EventService()