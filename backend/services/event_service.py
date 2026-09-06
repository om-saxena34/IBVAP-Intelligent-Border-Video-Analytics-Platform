from __future__ import annotations

from datetime import datetime
from threading import Lock
from typing import Dict, List, Optional

from backend.models.alert import CreateAlertRequest, Severity
from backend.models.event import CreateEventRequest, Event
from backend.services.alert_service import alert_service


class EventService:
    """Thread-safe service responsible for managing detected events."""

    def __init__(self) -> None:
        self._events: Dict[int, Event] = {}
        self._next_id: int = 1
        self._lock = Lock()
        self._last_event_time: Dict[str, datetime] = {}
        self._deduplication_seconds: float = 5.0

    def create_event(
        self,
        request: CreateEventRequest,
    ) -> Optional[Event]:
        """
        Create an event.

        Identical camera/event/severity combinations are suppressed
        for a short cooldown to prevent frame-by-frame event flooding.
        """
        event_time = request.timestamp or datetime.now()

        dedupe_key = (
            f"{request.camera_id}:"
            f"{request.event_type}:"
            f"{request.severity.value}"
        )

        with self._lock:
            previous_time = self._last_event_time.get(dedupe_key)
            if previous_time is not None:
                t_now = event_time.replace(tzinfo=None) if event_time.tzinfo else event_time
                t_prev = previous_time.replace(tzinfo=None) if previous_time.tzinfo else previous_time
                elapsed = (t_now - t_prev).total_seconds()
                if 0 <= elapsed < self._deduplication_seconds:
                    return None

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
            self._last_event_time[dedupe_key] = event_time

        # Alert Generation Rule:
        # HIGH and CRITICAL events automatically generate alerts.
        # LOW and MEDIUM remain events.
        if request.severity in {
            Severity.HIGH,
            Severity.CRITICAL,
        }:
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

    def get_all_events(
        self,
        camera_id: Optional[str] = None,
    ) -> List[Event]:
        """Return all events, newest first, optionally filtered by camera_id."""
        with self._lock:
            events = list(reversed(list(self._events.values())))
            if camera_id:
                events = [e for e in events if e.camera_id == camera_id]
            return events

    def get_events_today(self) -> List[Event]:
        """Return events generated today, newest first."""
        today = datetime.now().date()

        with self._lock:
            return [
                event
                for event in reversed(list(self._events.values()))
                if event.timestamp.date() == today
            ]

    def get_event(self, event_id: int) -> Optional[Event]:
        """Return a single event by ID."""
        with self._lock:
            return self._events.get(event_id)

    def get_recent_events_for_camera(
        self,
        camera_id: str,
        window_seconds: float = 60.0,
    ) -> List[Event]:
        """Return events recorded for a specific camera within the last N seconds."""
        now = datetime.now()
        recent = []
        with self._lock:
            for e in self._events.values():
                if e.camera_id == camera_id:
                    diff = (
                        now - e.timestamp.replace(tzinfo=None)
                        if e.timestamp.tzinfo
                        else now - e.timestamp
                    ).total_seconds()
                    if 0 <= diff <= window_seconds:
                        recent.append(e)
        return recent

    def get_total_events(self) -> int:
        """Return total number of events."""
        with self._lock:
            return len(self._events)

    def get_events_today_count(self) -> int:
        """Return today's event count."""
        today = datetime.now().date()

        with self._lock:
            return sum(
                1
                for event in self._events.values()
                if event.timestamp.date() == today
            )

    def clear(self) -> None:
        """Clear all events. Primarily useful for tests."""
        with self._lock:
            self._events.clear()
            self._last_event_time.clear()
            self._next_id = 1


event_service = EventService()