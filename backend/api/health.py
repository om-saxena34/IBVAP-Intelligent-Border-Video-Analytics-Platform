"""
System health and readiness endpoints for IBVAP.
"""
import time
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.services.stream_manager import stream_manager
from config.settings import settings

router = APIRouter(tags=["Health"])

_APP_START_TIME = time.time()


class SystemHealthResponse(BaseModel):
    """System overall health report."""
    status: str = Field(default="healthy", description="Global service health status")
    platform: str = Field(default="IBVAP", description="Intelligent Border Video Analytics Platform")
    version: str = Field(..., description="Application version")
    timestamp: datetime = Field(..., description="Current UTC timestamp")
    uptime_seconds: float = Field(..., description="Process uptime in seconds")
    total_cameras: int = Field(..., description="Total registered video streams")
    online_cameras: int = Field(..., description="Total active online streams")


@router.get(
    "/health",
    response_model=SystemHealthResponse,
    summary="Get system health status",
    description="Returns platform operational status, uptime, and camera ingestion counts.",
)
async def get_health() -> SystemHealthResponse:
    uptime = round(time.time() - _APP_START_TIME, 2)
    return SystemHealthResponse(
        status="healthy",
        platform=settings.API_TITLE,
        version=settings.API_VERSION,
        timestamp=datetime.now(timezone.utc),
        uptime_seconds=uptime,
        total_cameras=stream_manager.get_total_count(),
        online_cameras=stream_manager.get_online_count(),
    )
