"""
Stream Worker service for IBVAP.
Handles continuous frame acquisition from RTSP IP CCTV feeds and local MP4 files via OpenCV.
Provides frame buffering, OpenCV frame normalization, stream health monitoring,
drop detection, and automatic reconnection.
"""
import logging
import threading
import time
from collections import deque
from datetime import datetime, timezone
from typing import Deque, Optional

import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None  # type: ignore

from backend.models.camera import (
    StreamConnectRequest,
    StreamHealth,
    StreamSourceType,
    StreamStatus,
)
from backend.services.frame_processor import FrameProcessor
from config.settings import settings

logger = logging.getLogger("ibvap.stream_worker")


class StreamWorker:
    """Dedicated background worker for an individual camera stream."""

    def __init__(self, request: StreamConnectRequest):
        self.camera_id: str = request.camera_id
        self.source_url: str = request.source_url
        self.source_type: StreamSourceType = request.source_type
        self.location: Optional[str] = request.location
        self.sector: Optional[str] = request.sector
        self.loop_video: bool = request.loop_video

        self.reconnect_interval_sec: float = (
            request.reconnect_interval_sec or settings.DEFAULT_RECONNECT_INTERVAL_SEC
        )
        self.max_reconnect_attempts: int = (
            request.max_reconnect_attempts or settings.MAX_RECONNECT_ATTEMPTS
        )
        self.stream_timeout_sec: float = settings.STREAM_TIMEOUT_SEC
        self.max_buffer_size: int = settings.FRAME_BUFFER_MAX_SIZE

        self.status: StreamStatus = StreamStatus.OFFLINE
        self.created_at: datetime = datetime.now(timezone.utc)
        self._start_time: float = time.monotonic()
        self._last_frame_time: Optional[float] = None
        self._last_frame_datetime: Optional[datetime] = None

        self._total_frames: int = 0
        self._dropped_frames: int = 0
        self._reconnect_count: int = 0
        self._last_error: Optional[str] = None

        self._source_fps: float = 0.0
        self._width: int = 0
        self._height: int = 0

        self._fps_window: Deque[float] = deque(maxlen=30)
        self._calculated_fps: float = 0.0

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._latest_frame: Optional[np.ndarray] = None
        self._frame_buffer: Deque[np.ndarray] = deque(maxlen=self.max_buffer_size)
        self._processor = FrameProcessor()

    def start(self) -> None:
        """Start the background stream ingestion thread."""
        if self._thread is not None and self._thread.is_alive():
            logger.warning("Stream worker %s already running", self.camera_id)
            return

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run_worker,
            name=f"stream-worker-{self.camera_id}",
            daemon=True,
        )
        self._thread.start()
        logger.info("Started stream worker for camera: %s", self.camera_id)

    def stop(self, timeout: float = 3.0) -> None:
        """Stop worker thread and release video capture resources."""
        logger.info("Stopping stream worker for camera: %s", self.camera_id)
        self._stop_event.set()
        if self._thread is not None and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        self.status = StreamStatus.OFFLINE

    def is_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def get_latest_frame(self) -> Optional[np.ndarray]:
        """Return a copy of the most recently processed video frame."""
        with self._lock:
            if self._latest_frame is None:
                return None
            return self._latest_frame.copy()

    def get_latest_frame_jpeg(self, quality: int = 80) -> Optional[bytes]:
        """Encode the latest processed frame as JPEG bytes."""
        if cv2 is None:
            return None
        frame = self.get_latest_frame()
        if frame is None:
            return None
        success, encoded = cv2.imencode(
            ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        )
        return encoded.tobytes() if success else None

    def get_health(self) -> StreamHealth:
        """Calculate and return real-time stream health metrics."""
        now = time.monotonic()
        with self._lock:
            if (
                self.status == StreamStatus.ONLINE
                and self._last_frame_time is not None
                and now - self._last_frame_time > self.stream_timeout_sec
            ):
                self.status = StreamStatus.RECONNECTING
                self._last_error = f"Stream read timed out (> {self.stream_timeout_sec}s)"

            uptime = now - self._start_time
            resolution = f"{self._width}x{self._height}" if self._width > 0 else "0x0"
            return StreamHealth(
                camera_id=self.camera_id,
                status=self.status,
                fps=round(self._calculated_fps, 2),
                source_fps=round(self._source_fps, 2),
                resolution=resolution,
                total_frames_read=self._total_frames,
                dropped_frames=self._dropped_frames,
                reconnect_count=self._reconnect_count,
                last_frame_timestamp=self._last_frame_datetime,
                last_error=self._last_error,
                uptime_seconds=round(uptime, 2),
            )

    def _open_capture(self) -> Optional[object]:
        """Open an OpenCV capture and safely collect source metadata."""
        if cv2 is None:
            self._last_error = "OpenCV (cv2) is not installed in the Python environment"
            self.status = StreamStatus.ERROR
            return None

        source = int(self.source_url) if self.source_type == StreamSourceType.WEBCAM and self.source_url.isdigit() else self.source_url
        logger.info("Opening video source [%s] for %s", source, self.camera_id)

        try:
            cap = cv2.VideoCapture(source)
            if self.source_type == StreamSourceType.RTSP:
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)

            if not cap.isOpened():
                self._last_error = f"Failed to open video source: {self.source_url}"
                try:
                    cap.release()
                except Exception:
                    pass
                return None

            fps = cap.get(cv2.CAP_PROP_FPS)
            self._source_fps = fps if fps and 0 < fps < 120 else 25.0
            self._width = max(0, int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)))
            self._height = max(0, int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
            self._last_error = None
            return cap
        except Exception as exc:
            self._last_error = f"VideoCapture initialization error: {exc}"
            logger.exception("Error opening capture for %s", self.camera_id)
            return None

    def _run_worker(self) -> None:
        """Continuously capture, normalize, buffer, and monitor frames."""
        reconnect_attempts = 0

        while not self._stop_event.is_set():
            cap = self._open_capture()
            if cap is None:
                reconnect_attempts += 1
                self._reconnect_count += 1
                if reconnect_attempts >= self.max_reconnect_attempts:
                    self.status = StreamStatus.ERROR
                    logger.error("Max reconnect attempts (%d) reached for %s", self.max_reconnect_attempts, self.camera_id)
                    break

                self.status = StreamStatus.RECONNECTING
                sleep_time = min(self.reconnect_interval_sec * (1.2 ** reconnect_attempts), 30.0)
                self._sleep_interruptible(sleep_time)
                continue

            self.status = StreamStatus.ONLINE
            logger.info(
                "Camera %s is ONLINE (%dx%d @ %.1f FPS)",
                self.camera_id,
                self._width,
                self._height,
                self._source_fps,
            )

            frame_delay = (
                1.0 / self._source_fps
                if self.source_type == StreamSourceType.FILE and self._source_fps > 0
                else 0.001
            )
            consecutive_frames = 0

            while not self._stop_event.is_set():
                frame_start = time.monotonic()
                try:
                    ret, frame = cap.read()
                except Exception as exc:
                    ret, frame = False, None
                    self._last_error = f"Frame read error: {exc}"
                    logger.warning("Frame read error for %s: %s", self.camera_id, exc)

                if not ret or frame is None:
                    if self.source_type == StreamSourceType.FILE and self.loop_video:
                        try:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            ret, frame = cap.read()
                        except Exception as exc:
                            ret, frame = False, None
                            self._last_error = f"Video rewind error: {exc}"

                    if not ret or frame is None:
                        self._dropped_frames += 1
                        self.status = StreamStatus.RECONNECTING
                        self._last_error = self._last_error or "Frame read returned empty or disconnected"
                        break

                try:
                    processed_frame = self._processor.process(frame)
                except ValueError as exc:
                    self._dropped_frames += 1
                    self._last_error = f"Frame processing error: {exc}"
                    logger.warning("Frame processing error for %s: %s", self.camera_id, exc)
                    continue

                now = time.monotonic()
                utc_now = datetime.now(timezone.utc)
                with self._lock:
                    self._latest_frame = processed_frame.copy()
                    self._frame_buffer.append(processed_frame.copy())
                    self._total_frames += 1
                    self._last_frame_time = now
                    self._last_frame_datetime = utc_now
                    self._fps_window.append(now)
                    if len(self._fps_window) > 1:
                        span = self._fps_window[-1] - self._fps_window[0]
                        if span > 0:
                            self._calculated_fps = (len(self._fps_window) - 1) / span

                consecutive_frames += 1
                # A stream that has produced a stable run of frames is considered healthy;
                # this prevents one transient read failure from immediately exhausting retries.
                if consecutive_frames >= 30:
                    reconnect_attempts = 0
                    consecutive_frames = 0
                    self._last_error = None

                elapsed = time.monotonic() - frame_start
                wait_time = frame_delay - elapsed
                if wait_time > 0:
                    self._sleep_interruptible(wait_time)

            try:
                cap.release()
            except Exception:
                logger.debug("Capture release failed for %s", self.camera_id, exc_info=True)

            if self._stop_event.is_set():
                break

            reconnect_attempts += 1
            self._reconnect_count += 1
            if reconnect_attempts >= self.max_reconnect_attempts:
                self.status = StreamStatus.ERROR
                self._last_error = self._last_error or "Maximum reconnect attempts reached after stream read failure"
                break

            self.status = StreamStatus.RECONNECTING
            sleep_time = min(self.reconnect_interval_sec * (1.2 ** reconnect_attempts), 30.0)
            self._sleep_interruptible(sleep_time)

        if self.status != StreamStatus.ERROR:
            self.status = StreamStatus.OFFLINE
        logger.info("Stream worker for %s exited cleanly (status: %s)", self.camera_id, self.status)

    def _sleep_interruptible(self, seconds: float) -> None:
        """Sleep in small intervals so stop() can cancel promptly."""
        end_time = time.monotonic() + seconds
        while time.monotonic() < end_time and not self._stop_event.is_set():
            time.sleep(min(0.1, end_time - time.monotonic()))
