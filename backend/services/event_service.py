from datetime import datetime
from typing import Dict, List

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

        event = Event(
            id=self._next_id,
            camera_id=request.camera_id,
            event_type=request.event_type,
            severity=request.severity,
            timestamp=datetime.now(),
        )

        self._events[self._next_id] = event
        self._next_id += 1

        if request.severity in [Severity.HIGH, Severity.CRITICAL]:
            alert_service.create_alert(
                CreateAlertRequest(
                    camera_id=request.camera_id,
                    event_type=request.event_type,
                    severity=request.severity,
                )
            )

        return event

    def get_all_events(self) -> List[Event]:
        """Return all events."""
        return list(self._events.values())

    def get_total_events(self) -> int:
        """Return total number of events."""
        return len(self._events)


event_service = EventService()