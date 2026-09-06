"""
Zone, Perimeter Fence, and Movement Tracking Pydantic models for IBVAP.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field
from backend.models.alert import Severity


class ZoneType(str, Enum):
    """Supported zone and perimeter geometry classifications."""
    TRIPWIRE = "tripwire"
    RESTRICTED = "restricted"
    LOITERING = "loitering"
    PERIMETER = "perimeter"


class Point(BaseModel):
    """2D coordinate representing a position (normalized 0.0-1.0 or pixel coordinates)."""
    x: float = Field(..., ge=0.0, le=10000.0, description="X coordinate")
    y: float = Field(..., ge=0.0, le=10000.0, description="Y coordinate")


class ZoneConfig(BaseModel):
    """Definition of a camera-specific virtual fence or restricted zone."""
    zone_id: str = Field(..., description="Unique zone identifier (e.g., ZONE-001, TRIPWIRE-NORTH)")
    camera_id: str = Field(..., description="Camera ID the zone belongs to (e.g., CAM-001)")
    zone_name: str = Field(default="Restricted Zone", description="Human-readable zone label")
    zone_type: ZoneType = Field(default=ZoneType.RESTRICTED, description="Type of zone rule")
    coordinates: List[Point] = Field(
        ...,
        min_length=2,
        description="List of vertices (2 points for line/tripwire, 3+ for polygon)",
    )
    loitering_threshold_sec: float = Field(
        default=10.0,
        ge=1.0,
        le=3600.0,
        description="Seconds a subject can remain in zone before triggering LOITERING alert",
    )
    is_active: bool = Field(default=True, description="Whether this zone rule is actively enforced")
    color: Optional[str] = Field(default="#ef4444", description="Hex color code for UI rendering")
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp of zone creation")


class CreateZoneRequest(BaseModel):
    """Payload to create or configure a new camera zone."""
    zone_id: Optional[str] = Field(default=None, description="Optional custom zone ID")
    camera_id: str = Field(..., description="Target camera identifier")
    zone_name: str = Field(default="Virtual Perimeter Fence", description="Zone label")
    zone_type: ZoneType = Field(default=ZoneType.TRIPWIRE, description="tripwire, restricted, loitering, perimeter")
    coordinates: List[Point] = Field(..., min_length=2, description="2 points for line, 3+ for polygon")
    loitering_threshold_sec: Optional[float] = Field(default=10.0, ge=1.0)
    is_active: bool = Field(default=True)
    color: Optional[str] = Field(default="#ef4444")


class ZoneListResponse(BaseModel):
    """Response containing configured border zones."""
    total: int
    zones: List[ZoneConfig]


class MovementTrack(BaseModel):
    """Tracked subject trajectory for rule-based movement evaluation."""
    subject_id: str = Field(..., description="Tracked subject identifier (e.g. TRK-104)")
    subject_type: str = Field(default="PERSON", description="Subject classification: PERSON or VEHICLE")
    path: List[Point] = Field(default_factory=list, description="Historical trajectory points")
    current_position: Point = Field(..., description="Current position of the subject")
    dwell_time_seconds: float = Field(default=0.0, description="Dwell duration in current area in seconds")
    speed: float = Field(default=1.0, description="Estimated movement speed (pixels/sec or normalized)")
    timestamp: Optional[datetime] = Field(default=None, description="Time of detection")


class EvaluateMovementRequest(BaseModel):
    """Payload to evaluate subject movement tracks against camera border intelligence rules."""
    camera_id: str = Field(..., description="Camera identifier")
    tracks: List[MovementTrack] = Field(..., description="Active movement tracks to evaluate")
    current_time: Optional[datetime] = Field(default=None, description="Current evaluation timestamp")


class SimulateDetectionRequest(BaseModel):
    """Payload to simulate a border intelligence event for testing and operator preview."""
    camera_id: str = Field(default="CAM-001", description="Camera ID")
    event_type: str = Field(
        ...,
        description=(
            "Event type: VIRTUAL_FENCE_BREACH, RESTRICTED_ZONE_ENTRY, LOITERING, "
            "UNUSUAL_MOVEMENT, NIGHT_TIME_MOVEMENT, GROUP_MOVEMENT, SUSPICIOUS_SEQUENCE"
        ),
        examples=["VIRTUAL_FENCE_BREACH"],
    )
    subject_type: str = Field(default="PERSON", description="PERSON or VEHICLE")
    severity: Optional[Severity] = Field(default=None, description="Override severity (LOW, MEDIUM, HIGH, CRITICAL)")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Override confidence score")
    custom_details: Optional[Dict[str, Any]] = Field(default=None, description="Optional extra details")
