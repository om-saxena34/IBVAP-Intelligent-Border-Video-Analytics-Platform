from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.models.alert import Severity


class Event(BaseModel):
    """Represents an event detected by the AI."""

    id: int = Field(
        ...,
        description="Unique event identifier",
        examples=[1],
    )

    camera_id: str = Field(
        ...,
        description="Camera that generated the event",
        examples=["CAM_001"],
    )

    event_type: str = Field(
        ...,
        description="Type of detected event",
        examples=["VIRTUAL_FENCE_BREACH"],
    )

    severity: Severity = Field(
        ...,
        description="Severity level of the event",
        examples=[Severity.HIGH],
    )

    timestamp: datetime = Field(
        ...,
        description="Time when the event was generated",
    )

    confidence: float = Field(
        default=0.92,
        ge=0.0,
        le=1.0,
        description="Confidence score of the AI detection",
        examples=[0.92],
    )

    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional metadata or forensic contextual parameters",
    )


class CreateEventRequest(BaseModel):
    """Request payload to create a new event."""

    camera_id: str = Field(
        ...,
        description="Camera that generated the event",
        examples=["CAM_001"],
    )

    event_type: str = Field(
        ...,
        description="Type of detected event",
        examples=["VIRTUAL_FENCE_BREACH"],
    )

    severity: Severity = Field(
        ...,
        description="Severity level of the event",
        examples=[Severity.HIGH],
    )

    confidence: Optional[float] = Field(
        default=0.92,
        ge=0.0,
        le=1.0,
        description="Confidence score of the detection",
        examples=[0.92],
    )

    timestamp: Optional[datetime] = Field(
        default=None,
        description="Optional custom event timestamp (defaults to current time if omitted)",
    )

    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional metadata or forensic contextual parameters",
    )


class EventListResponse(BaseModel):
    """Response containing all detected events."""

    total: int = Field(
        ...,
        description="Total number of events",
        examples=[5],
    )

    events: List[Event] = Field(
        ...,
        description="List of detected events",
    )