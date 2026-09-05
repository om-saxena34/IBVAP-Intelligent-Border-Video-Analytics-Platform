"""
Event Pydantic models for IBVAP.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from backend.models.alert import Severity
from typing import List


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
        examples=["Person Detected"],
    )

    severity: Severity = Field(
        ...,
        description="Severity level of the event",
        examples=[Severity.LOW],
    )

    timestamp: datetime = Field(
        ...,
        description="Time when the event was generated",
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
        examples=["Person Detected"],
    )

    severity: Severity = Field(
        ...,
        description="Severity level of the event",
        examples=[Severity.LOW],
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