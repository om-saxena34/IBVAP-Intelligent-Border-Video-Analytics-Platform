"""
Camera and Stream Ingestion Pydantic models.
Defines schema for stream registration, connection status, and real-time health metrics.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class StreamStatus(str, Enum):
    """Lifecycle connection status for an active CCTV or video source."""
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    RECONNECTING = "RECONNECTING"
    ERROR = "ERROR"


class StreamSourceType(str, Enum):
    """Supported stream ingestion source types."""
    RTSP = "RTSP"
    FILE = "FILE"
    WEBCAM = "WEBCAM"


class StreamConnectRequest(BaseModel):
    """Payload to register and connect a CCTV stream or video file."""
    camera_id: str = Field(
        ...,
        min_length=2,
        max_length=64,
        description="Unique camera identifier (e.g. CAM_01, BOP_NORTH_04)",
        examples=["CAM_01"]
    )
    source_url: str = Field(
        ...,
        description="RTSP URI, local file path (MP4/MKV), or webcam index (0, 1)",
        examples=["data/test_cctv.mp4", "rtsp://admin:pass@192.168.1.100:554/stream1"]
    )
    source_type: StreamSourceType = Field(
        default=StreamSourceType.FILE,
        description="Type of stream input"
    )
    location: Optional[str] = Field(
        default=None,
        description="Physical location or checkpost name",
        examples=["BOP Post Alpha - North Gate"]
    )
    sector: Optional[str] = Field(
        default=None,
        description="Border surveillance sector",
        examples=["Sector 4"]
    )
    loop_video: bool = Field(
        default=True,
        description="If True and source_type is FILE, loop playback continuously"
    )
    reconnect_interval_sec: Optional[float] = Field(
        default=None,
        ge=0.5,
        le=60.0,
        description="Custom reconnect delay in seconds on stream drop"
    )
    max_reconnect_attempts: Optional[int] = Field(
        default=None,
        ge=1,
        le=100,
        description="Maximum reconnection attempts before marking as ERROR"
    )


class StreamHealth(BaseModel):
    """Real-time health statistics for an active camera stream."""
    camera_id: str
    status: StreamStatus
    fps: float = Field(default=0.0, description="Real-time processed frames per second")
    source_fps: float = Field(default=0.0, description="Nominal source FPS reported by OpenCV")
    resolution: str = Field(default="0x0", description="Stream resolution e.g. 1920x1080")
    total_frames_read: int = Field(default=0, description="Total successfully decoded frames")
    dropped_frames: int = Field(default=0, description="Number of dropped or unreadable frames")
    reconnect_count: int = Field(default=0, description="Number of reconnect attempts performed")
    last_frame_timestamp: Optional[datetime] = Field(default=None, description="Timestamp of latest frame")
    last_error: Optional[str] = Field(default=None, description="Last recorded error message")
    uptime_seconds: float = Field(default=0.0, description="Stream worker uptime in seconds")


class StreamInfo(BaseModel):
    """Full stream summary including configuration and current health."""
    camera_id: str
    source_url: str
    source_type: StreamSourceType
    location: Optional[str] = None
    sector: Optional[str] = None
    status: StreamStatus
    created_at: datetime
    health: StreamHealth


class StreamDisconnectResponse(BaseModel):
    """Response returned upon stream disconnection."""
    camera_id: str
    status: StreamStatus
    message: str
