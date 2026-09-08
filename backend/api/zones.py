"""
Zone management API for IBVAP.
Allows querying and updating virtual fence and restricted zone geometry for cameras.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.services.stream_manager import stream_manager

router = APIRouter(prefix="/intelligence/zones", tags=["Intelligence Zones"])


class ZoneUpdateRequest(BaseModel):
    camera_id: str = Field(..., description="Target camera identifier")
    fence: Optional[tuple[tuple[int, int], tuple[int, int]]] = Field(
        None,
        description="Virtual fence line coordinates ((x1, y1), (x2, y2))",
    )
    restricted_zone: Optional[List[tuple[int, int]]] = Field(
        None,
        description="Restricted zone polygon vertices [(x1, y1), (x2, y2), ...]",
    )


@router.get(
    "",
    summary="List all configured border zones",
    description="Returns virtual fences and restricted zones configured for registered cameras.",
)
async def list_zones() -> List[dict[str, Any]]:
    zones = stream_manager.get_all_camera_zones()
    if not zones:
        # Provide demo default zones so frontend has immediate visibility
        return [
            {
                "camera_id": "DEFAULT",
                "fence": ((340, 150), (340, 650)),
                "restricted_zone": [
                    (180, 260),
                    (360, 260),
                    (360, 500),
                    (180, 500),
                ],
                "expected_direction": (1.0, 0.0),
                "loitering_seconds": 15.0,
            }
        ]
    return zones


@router.get(
    "/{camera_id}",
    summary="Get zones for a specific camera",
)
async def get_camera_zones(camera_id: str) -> dict[str, Any]:
    zones = stream_manager.get_camera_zones(camera_id)
    if not zones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera '{camera_id}' not found",
        )
    return zones


@router.post(
    "",
    summary="Configure camera zones",
    description="Updates or sets virtual fence line and restricted zone polygon for a camera.",
)
async def update_zones(req: ZoneUpdateRequest) -> dict[str, Any]:
    success = stream_manager.update_camera_zones(
        camera_id=req.camera_id,
        fence=req.fence,
        restricted_zone=req.restricted_zone,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera stream '{req.camera_id}' not found",
        )

    return {
        "camera_id": req.camera_id,
        "status": "updated",
        "zones": stream_manager.get_camera_zones(req.camera_id),
    }
