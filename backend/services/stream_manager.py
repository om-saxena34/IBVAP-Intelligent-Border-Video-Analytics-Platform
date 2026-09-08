"""
Stream Manager service for IBVAP.
Coordinates lifecycle, health queries, and operations across multiple camera stream workers.
"""
import logging
import threading
import time
from typing import Any, Dict, List, Optional

import numpy as np

from backend.models.camera import (
    StreamConnectRequest,
    StreamHealth,
    StreamInfo,
    StreamStatus,
)
from backend.services.stream_worker import StreamWorker

logger = logging.getLogger("ibvap.stream_manager")


class StreamManager:
    """
    Central registry and supervisor for all camera ingestion streams.
    Thread-safe operations for adding, querying, and removing active streams.
    """

    def __init__(self):
        self._lock: threading.Lock = threading.Lock()
        self._workers: Dict[str, StreamWorker] = {}

    def connect_stream(self, request: StreamConnectRequest) -> StreamInfo:
        """
        Register and start an ingestion stream for the given camera.
        If camera_id is already active, existing worker is cleanly stopped first.
        """
        with self._lock:
            if request.camera_id in self._workers:
                logger.info("Replacing existing stream worker for %s", request.camera_id)
                old_worker = self._workers[request.camera_id]
                old_worker.stop()

            worker = StreamWorker(request)
            self._workers[request.camera_id] = worker
            worker.start()

        # Give worker up to 500ms to open capture and update initial status
        time.sleep(0.5)
        return self._build_stream_info(worker)

    def disconnect_stream(self, camera_id: str) -> bool:
        """Stop and remove an active stream worker."""
        with self._lock:
            worker = self._workers.pop(camera_id, None)

        if worker:
            worker.stop()
            logger.info("Stream %s disconnected and removed from registry", camera_id)
            return True
        return False

    def get_stream_info(self, camera_id: str) -> Optional[StreamInfo]:
        """Retrieve stream configuration and real-time health."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return None
        return self._build_stream_info(worker)

    def get_stream_health(self, camera_id: str) -> Optional[StreamHealth]:
        """Retrieve live health metrics for a specific camera."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return None
        return worker.get_health()

    def list_streams(self) -> List[StreamInfo]:
        """Return information and health for all registered streams."""
        with self._lock:
            workers = list(self._workers.values())

        return [self._build_stream_info(w) for w in workers]

    def get_latest_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """Get the latest decoded frame from a specific camera."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return None
        return worker.get_latest_frame()

    def get_latest_frame_jpeg(self, camera_id: str, quality: int = 80) -> Optional[bytes]:
        """Get the latest decoded frame encoded as JPEG bytes."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return None
        return worker.get_latest_frame_jpeg(quality=quality)

    def get_latest_annotated_frame_jpeg(self, camera_id: str, quality: int = 80) -> Optional[bytes]:
        """Get the latest AI-annotated frame encoded as JPEG bytes."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return None
        return worker.get_latest_annotated_frame_jpeg(quality=quality)

    def get_latest_detections(self, camera_id: str) -> Optional[dict[str, Any]]:
        """Get the latest detections telemetry for a camera."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return None
        return worker.get_latest_detections()

    def generate_mjpeg_stream(self, camera_id: str, annotated: bool = True, target_fps: int = 25):
        """Generate MJPEG video stream chunks for a camera."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return None
        return worker.generate_mjpeg_stream(annotated=annotated, target_fps=target_fps)

    def update_camera_zones(
        self,
        camera_id: str,
        fence: tuple[tuple[int, int], tuple[int, int]] | None = None,
        restricted_zone: list[tuple[int, int]] | None = None,
    ) -> bool:
        """Dynamically update virtual fence and restricted zone for a camera."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return False

        worker.update_zones(fence=fence, restricted_zone=restricted_zone)
        return True

    def get_camera_zones(self, camera_id: str) -> Optional[dict[str, Any]]:
        """Get configured zones for a camera."""
        with self._lock:
            worker = self._workers.get(camera_id)

        if not worker:
            return None

        engine = worker._get_analytics_engine()
        return {
            "camera_id": camera_id,
            "fence": engine.fence,
            "restricted_zone": engine.restricted_zone,
            "expected_direction": engine.expected_direction,
            "loitering_seconds": engine.loitering_seconds,
        }

    def get_all_camera_zones(self) -> list[dict[str, Any]]:
        """List zones for all registered cameras."""
        with self._lock:
            camera_ids = list(self._workers.keys())

        result = []
        for cid in camera_ids:
            zones = self.get_camera_zones(cid)
            if zones:
                result.append(zones)
        return result

    def get_total_count(self) -> int:
        """Total number of registered camera streams."""
        with self._lock:
            return len(self._workers)

    def get_online_count(self) -> int:
        """Count of streams currently in ONLINE state."""
        with self._lock:
            return sum(
                1 for w in self._workers.values()
                if w.get_health().status == StreamStatus.ONLINE
            )

    def shutdown_all(self) -> None:
        """Stop all active stream workers during application shutdown."""
        with self._lock:
            workers = list(self._workers.values())
            self._workers.clear()

        logger.info("Shutting down %d active stream workers...", len(workers))
        for worker in workers:
            try:
                worker.stop()
            except Exception as e:
                logger.error("Error stopping worker %s: %s", worker.camera_id, e)

    @staticmethod
    def _build_stream_info(worker: StreamWorker) -> StreamInfo:
        """Construct StreamInfo response model from worker instance."""
        health = worker.get_health()
        return StreamInfo(
            camera_id=worker.camera_id,
            source_url=worker.source_url,
            source_type=worker.source_type,
            location=worker.location,
            sector=worker.sector,
            status=health.status,
            created_at=worker.created_at,
            health=health,
        )


stream_manager = StreamManager()
