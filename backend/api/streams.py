from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status
from fastapi.responses import StreamingResponse

from backend.models.camera import (
    StreamConnectRequest,
    StreamDisconnectResponse,
    StreamHealth,
    StreamInfo,
    StreamStatus,
)
from backend.services.stream_manager import stream_manager

router = APIRouter(prefix="/streams", tags=["Streams"])


@router.post(
    "/connect",
    response_model=StreamInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Connect a CCTV or video stream",
    description="Registers and launches an ingestion worker for an RTSP camera, MP4 test video, or webcam.",
)
async def connect_stream(request: StreamConnectRequest) -> StreamInfo:
    try:
        stream_info = stream_manager.connect_stream(request)
        return stream_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize stream: {str(e)}",
        )


@router.post(
    "/upload",
    summary="Upload a CCTV video file to local samples folder",
    description="Saves an uploaded MP4/video file to samples/ for direct ingestion.",
)
async def upload_video(file: UploadFile = File(...)) -> dict:
    try:
        samples_dir = Path("samples")
        samples_dir.mkdir(parents=True, exist_ok=True)

        filename = Path(file.filename or "cctv_upload.mp4").name
        dest_path = samples_dir / filename

        contents = await file.read()
        dest_path.write_bytes(contents)

        return {
            "filename": filename,
            "path": f"samples/{filename}",
            "size_bytes": len(contents),
            "status": "ready",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )


@router.get(
    "",
    response_model=List[StreamInfo],
    summary="List all registered streams",
    description="Returns configuration and real-time health metrics for all registered cameras.",
)
async def list_streams() -> List[StreamInfo]:
    return stream_manager.list_streams()


@router.get(
    "/{camera_id}",
    response_model=StreamInfo,
    summary="Get stream details",
    description="Returns metadata and current health for the specified camera stream.",
)
async def get_stream(camera_id: str) -> StreamInfo:
    stream_info = stream_manager.get_stream_info(camera_id)
    if not stream_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera stream '{camera_id}' not found",
        )
    return stream_info


@router.get(
    "/{camera_id}/health",
    response_model=StreamHealth,
    summary="Get stream health",
    description="Returns real-time FPS, frame counts, dropped frames, and connection status.",
)
async def get_stream_health(camera_id: str) -> StreamHealth:
    health = stream_manager.get_stream_health(camera_id)
    if not health:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera stream '{camera_id}' not found",
        )
    return health


@router.get(
    "/{camera_id}/detections",
    summary="Get latest AI detections and tracking telemetry",
    description="Returns structured coordinates, classes, track IDs, threat levels, and rule violations.",
)
async def get_stream_detections(camera_id: str) -> dict:
    telemetry = stream_manager.get_latest_detections(camera_id)
    if telemetry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera stream '{camera_id}' not found",
        )
    return telemetry


@router.get(
    "/{camera_id}/live",
    summary="Live video stream (MJPEG with real-time AI overlay)",
    description="Streams multipart JPEG frames with YOLO detections, tracking IDs, and border zones at high FPS.",
)
async def get_live_stream(camera_id: str, annotated: bool = True) -> StreamingResponse:
    generator = stream_manager.generate_mjpeg_stream(camera_id, annotated=annotated, target_fps=25)
    if generator is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera stream '{camera_id}' not found or offline",
        )
    return StreamingResponse(
        generator,
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get(
    "/{camera_id}/snapshot",
    summary="Get latest video frame snapshot",
    description="Returns the most recently decoded video frame encoded as a JPEG image, optionally with AI annotations.",
    responses={
        200: {"content": {"image/jpeg": {}}},
        404: {"description": "Stream not found"},
        503: {"description": "No frame captured yet"},
    },
)
async def get_stream_snapshot(camera_id: str, annotated: bool = True) -> Response:
    if annotated:
        jpeg_bytes = stream_manager.get_latest_annotated_frame_jpeg(camera_id)
    else:
        jpeg_bytes = stream_manager.get_latest_frame_jpeg(camera_id)

    if jpeg_bytes is None:
        jpeg_bytes = stream_manager.get_latest_frame_jpeg(camera_id)

    if jpeg_bytes is None:
        health = stream_manager.get_stream_health(camera_id)
        if not health:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Camera stream '{camera_id}' not found",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No video frame captured yet for camera '{camera_id}' (status: {health.status})",
        )
    return Response(content=jpeg_bytes, media_type="image/jpeg")


@router.post(
    "/{camera_id}/disconnect",
    response_model=StreamDisconnectResponse,
    summary="Disconnect camera stream (POST)",
)
async def disconnect_stream_post(camera_id: str) -> StreamDisconnectResponse:
    success = stream_manager.disconnect_stream(camera_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera stream '{camera_id}' not found or already disconnected",
        )
    return StreamDisconnectResponse(
        camera_id=camera_id,
        status=StreamStatus.OFFLINE,
        message=f"Stream '{camera_id}' disconnected successfully",
    )


@router.delete(
    "/{camera_id}",
    response_model=StreamDisconnectResponse,
    summary="Disconnect camera stream (DELETE)",
)
async def disconnect_stream_delete(camera_id: str) -> StreamDisconnectResponse:
    success = stream_manager.disconnect_stream(camera_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera stream '{camera_id}' not found or already disconnected",
        )
    return StreamDisconnectResponse(
        camera_id=camera_id,
        status=StreamStatus.OFFLINE,
        message=f"Stream '{camera_id}' disconnected successfully",
    )
