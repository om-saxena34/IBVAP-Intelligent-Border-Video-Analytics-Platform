from typing import Optional
from fastapi import APIRouter, Query

from backend.models.event import (
    CreateEventRequest,
    Event,
    EventListResponse,
)
from backend.services.event_service import event_service

router = APIRouter(prefix="/events", tags=["Events"])


@router.post(
    "",
    response_model=Event,
    summary="Create a new event",
    description="Logs a detected border event and triggers alert creation for HIGH/CRITICAL events.",
)
async def create_event(request: CreateEventRequest) -> Event:
    return event_service.create_event(request)


@router.get(
    "",
    response_model=EventListResponse,
    summary="Get all detected events",
    description="Returns all AI-detected events along with the total event count.",
)
async def get_all_events(
    camera_id: Optional[str] = Query(default=None, description="Filter events by camera ID"),
) -> EventListResponse:
    events = event_service.get_all_events(camera_id=camera_id)

    return EventListResponse(
        total=len(events) if camera_id else event_service.get_total_events(),
        events=events,
    )