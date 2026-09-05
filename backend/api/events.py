from typing import List
from fastapi import APIRouter

from backend.models.event import Event, CreateEventRequest
from backend.services.event_service import event_service
from backend.models.event import (
    Event,
    CreateEventRequest,
    EventListResponse,
)

router = APIRouter(prefix="/events", tags=["Events"])


@router.post(
    "",
    response_model=Event,
    summary="Create a new event",
)
async def create_event(request: CreateEventRequest) -> Event:
    return event_service.create_event(request)


@router.get(
    "",
    response_model=EventListResponse,
    summary="Get all detected events",
    description="Returns all AI-detected events along with the total event count.",
)
async def get_all_events() -> EventListResponse:
    events = event_service.get_all_events()

    return EventListResponse(
        total=event_service.get_total_events(),
        events=events,
    )