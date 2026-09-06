from __future__ import annotations

from typing import Any

from backend.models.event import CreateEventRequest
from backend.models.alert import Severity
from backend.services.event_service import event_service


# Analytics event → platform event mapping.
EVENT_SEVERITY: dict[str, Severity] = {
    "virtual_fence": Severity.HIGH,
    "restricted_zone": Severity.CRITICAL,
    "loitering": Severity.MEDIUM,
    "night_movement": Severity.HIGH,
    "wrong_direction": Severity.HIGH,
    "group_movement": Severity.MEDIUM,
}


def normalize_event_type(value: Any) -> str:
    """
    Normalize analytics event names so different detectors can
    safely feed the event service.
    """

    if value is None:
        return "unknown"

    return str(value).strip().lower().replace(" ", "_")


def get_event_type(event: dict[str, Any]) -> str:
    """
    Extract event type from the analytics detector result.

    Supports common keys without requiring every detector to use
    exactly the same field name.
    """

    return normalize_event_type(
        event.get("event_type")
        or event.get("type")
        or event.get("name")
        or event.get("event")
    )


def get_severity(
    event: dict[str, Any],
    event_type: str,
) -> Severity:
    """Resolve event severity."""

    raw = event.get("severity")

    if isinstance(raw, Severity):
        return raw

    if raw is not None:
        normalized = str(raw).strip().upper()

        try:
            return Severity(normalized)
        except ValueError:
            pass

    return EVENT_SEVERITY.get(
        event_type,
        Severity.MEDIUM,
    )


def persist_analytics_events(
    camera_id: str,
    events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Convert analytics-engine events into platform events.

    Returns only successfully persisted events.
    """

    persisted: list[dict[str, Any]] = []

    for analytics_event in events:
        if not isinstance(analytics_event, dict):
            continue

        event_type = get_event_type(analytics_event)

        if event_type == "unknown":
            continue

        severity = get_severity(
            analytics_event,
            event_type,
        )

        event = event_service.create_event(
            CreateEventRequest(
                camera_id=camera_id,
                event_type=event_type,
                severity=severity,
            )
        )

        if event is None:
            # Deduplicated event.
            continue

        event_dict = {
            "id": event.id,
            "camera_id": event.camera_id,
            "event_type": event.event_type,
            "severity": event.severity,
            "timestamp": event.timestamp.isoformat(),
            "source": "analytics",
            "analytics": analytics_event,
        }

        persisted.append(event_dict)

    return persisted