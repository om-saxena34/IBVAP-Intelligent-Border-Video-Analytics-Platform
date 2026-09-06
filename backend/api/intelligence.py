"""
Border Intelligence and Virtual Fence endpoints for IBVAP.
Provides APIs for:
- Virtual fence and restricted zone configuration.
- Real-time movement trajectory evaluation against rules.
- Test detection simulations (breach, loitering, zone entry, night movement, group movement, sequence correlation).
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.models.event import Event
from backend.models.zone import (
    CreateZoneRequest,
    EvaluateMovementRequest,
    SimulateDetectionRequest,
    ZoneConfig,
    ZoneListResponse,
)
from backend.services.intelligence_service import intelligence_service

router = APIRouter(prefix="/intelligence", tags=["Border Intelligence"])


@router.get(
    "/zones",
    response_model=ZoneListResponse,
    summary="List all configured virtual fences and zones",
    description="Returns all active virtual fence tripwires and restricted zone polygons.",
)
async def list_zones(
    camera_id: Optional[str] = Query(default=None, description="Filter zones by camera ID"),
) -> ZoneListResponse:
    zones = intelligence_service.get_all_zones(camera_id=camera_id)
    return ZoneListResponse(
        total=len(zones),
        zones=zones,
    )


@router.post(
    "/zones",
    response_model=ZoneConfig,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a camera zone / virtual fence",
    description="Registers a new virtual line or restricted polygon boundary for a camera.",
)
async def create_zone(request: CreateZoneRequest) -> ZoneConfig:
    return intelligence_service.create_zone(request)


@router.delete(
    "/zones/{zone_id}",
    summary="Delete a zone configuration",
    description="Removes a virtual fence or zone boundary.",
)
async def delete_zone(zone_id: str) -> dict:
    success = intelligence_service.delete_zone(zone_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zone '{zone_id}' not found",
        )
    return {"message": f"Zone '{zone_id}' removed successfully", "zone_id": zone_id}


@router.post(
    "/evaluate",
    response_model=List[Event],
    summary="Evaluate tracked movement against border rules",
    description="Evaluates trajectories for fence crossing, restricted zone entry, loitering, night-time movement, and group movement.",
)
async def evaluate_movement(request: EvaluateMovementRequest) -> List[Event]:
    return intelligence_service.evaluate_movement(request)


@router.post(
    "/simulate",
    response_model=Event,
    summary="Simulate a border threat detection",
    description="Simulates a Phase 2 detection rule (e.g. VIRTUAL_FENCE_BREACH, RESTRICTED_ZONE_ENTRY, LOITERING, NIGHT_TIME_MOVEMENT, GROUP_MOVEMENT, SUSPICIOUS_SEQUENCE) and triggers event/alert creation.",
)
async def simulate_detection(request: SimulateDetectionRequest) -> Event:
    return intelligence_service.simulate_detection(request)
