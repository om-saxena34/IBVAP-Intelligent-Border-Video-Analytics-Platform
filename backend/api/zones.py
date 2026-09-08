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
    fence: Optional[Any] = Field(
        None,
        description="Virtual fence line coordinates ((x1, y1), (x2, y2))",
    )
    virtual_fence: Optional[Any] = Field(
        None,
        description="Virtual fence line coordinates list [[x1, y1], [x2, y2]]",
    )
    restricted_zone: Optional[Any] = Field(
        None,
        description="Restricted zone polygon vertices [(x1, y1), (x2, y2), ...]",
    )
    min_loitering_seconds: Optional[float] = None
    max_group_size: Optional[int] = None


@router.get(
    "/all",
    summary="List all configured border zones",
    description="Returns virtual fences and restricted zones configured for registered cameras.",
)
async def list_all_zones() -> List[dict[str, Any]]:
    zones = stream_manager.get_all_camera_zones()
    if not zones:
        # Provide demo default zones so frontend has immediate visibility
        return [
            {
                "camera_id": "DEFAULT",
                "fence": ((340, 150), (340, 650)),
                "virtual_fence": [[340, 150], [340, 650]],
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
    # Ensure virtual_fence is also included in each zone dict
    for z in zones:
        if "fence" in z and "virtual_fence" not in z:
            z["virtual_fence"] = list(z["fence"]) if z["fence"] else None
    return zones


@router.get(
    "/{camera_id}",
    summary="Get zones for a specific camera",
)
async def get_camera_zones(camera_id: str) -> dict[str, Any]:
    zones = stream_manager.get_camera_zones(camera_id)
    if not zones:
        # Fallback default so UI never crashes if stream is freshly connecting
        return {
            "camera_id": camera_id,
            "fence": ((340, 150), (340, 650)),
            "virtual_fence": [[340, 150], [340, 650]],
            "restricted_zone": [
                (180, 260),
                (360, 260),
                (360, 500),
                (180, 500),
            ],
            "expected_direction": (1.0, 0.0),
            "loitering_seconds": 15.0,
        }
    if "fence" in zones and "virtual_fence" not in zones:
        zones["virtual_fence"] = list(zones["fence"]) if zones["fence"] else None
    return zones


@router.post(
    "/config",
    summary="Configure camera zones",
    description="Updates or sets virtual fence line and restricted zone polygon for a camera.",
)
async def update_zones(req: ZoneUpdateRequest) -> dict[str, Any]:
    # Normalize fence coordinates
    fence_coord = req.fence
    if fence_coord is None and req.virtual_fence is not None:
        vf = req.virtual_fence
        if isinstance(vf, (list, tuple)) and len(vf) >= 2:
            fence_coord = ((int(vf[0][0]), int(vf[0][1])), (int(vf[1][0]), int(vf[1][1])))

    # Normalize restricted zone polygon
    rz_coord = None
    if req.restricted_zone is not None and isinstance(req.restricted_zone, (list, tuple)):
        rz_coord = [(int(p[0]), int(p[1])) for p in req.restricted_zone]

    success = stream_manager.update_camera_zones(
        camera_id=req.camera_id,
        fence=fence_coord,
        restricted_zone=rz_coord,
    )

    cam_zones = stream_manager.get_camera_zones(req.camera_id) or {
        "camera_id": req.camera_id,
        "fence": fence_coord,
        "virtual_fence": list(fence_coord) if fence_coord else None,
        "restricted_zone": rz_coord,
    }
    if "virtual_fence" not in cam_zones and "fence" in cam_zones:
        cam_zones["virtual_fence"] = list(cam_zones["fence"]) if cam_zones["fence"] else None

    return {
        "camera_id": req.camera_id,
        "status": "updated" if success else "pending",
        "zones": cam_zones,
    }
