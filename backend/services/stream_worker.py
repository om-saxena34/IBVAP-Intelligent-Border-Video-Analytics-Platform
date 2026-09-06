"""
Stream Worker service for IBVAP.

Handles continuous frame acquisition from RTSP IP CCTV feeds,
local MP4 files, and webcams via OpenCV.

Provides:
- Continuous frame ingestion
- Thread-safe latest-frame buffering
- Stream health monitoring
- FPS calculation
- Automatic reconnection
- Background analytics processing
- Analytics -> Events -> Alerts integration
- Event evidence snapshot storage
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
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
from backend.services.analytics_engine import AnalyticsEngine
from backend.services.analytics_event_bridge import (
    persist_analytics_events,
)
from config.settings import settings


logger = logging.getLogger("ibvap.stream_worker")


class StreamWorker:
    """
    Dedicated background worker for one camera stream.

    Capture and analytics are deliberately separated so expensive AI
    inference never blocks video ingestion or stream health metrics.
    """

    # Maximum age of a frame waiting for analytics.
    # We prefer recent frames over processing a stale backlog.
    ANALYTICS_QUEUE_SIZE = 2

    # Analytics execution interval.
    ANALYTICS_INTERVAL_SEC = 0.20

    # Prevent the same analytics event from generating repeated
    # platform events too frequently.
    EVENT_COOLDOWN_SEC = 5.0

    def __init__(self, request: StreamConnectRequest):
        self.camera_id: str = request.camera_id
        self.source_url: str = request.source_url
        self.source_type: StreamSourceType = request.source_type
        self.location: Optional[str] = request.location
        self.sector: Optional[str] = request.sector
        self.loop_video: bool = request.loop_video

        # Reconnect parameters
        self.reconnect_interval_sec: float = (
            request.reconnect_interval_sec
            or settings.DEFAULT_RECONNECT_INTERVAL_SEC
        )

        self.max_reconnect_attempts: int = (
            request.max_reconnect_attempts
            or settings.MAX_RECONNECT_ATTEMPTS
        )

        self.stream_timeout_sec: float = (
            settings.STREAM_TIMEOUT_SEC
        )

        self.max_buffer_size: int = (
            settings.FRAME_BUFFER_MAX_SIZE
        )

        # Health & state
        self.status: StreamStatus = StreamStatus.OFFLINE
        self.created_at: datetime = datetime.now(timezone.utc)

        self._start_time: float = time.time()
        self._last_frame_time: Optional[float] = None
        self._last_frame_datetime: Optional[datetime] = None

        self._total_frames: int = 0
        self._dropped_frames: int = 0
        self._reconnect_count: int = 0
        self._last_error: Optional[str] = None

        self._source_fps: float = 0.0
        self._width: int = 0
        self._height: int = 0

        # FPS calculation
        self._fps_window: Deque[float] = deque(maxlen=30)
        self._calculated_fps: float = 0.0

        # Capture thread
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

        # Analytics thread
        self._analytics_stop_event = threading.Event()
        self._analytics_thread: Optional[threading.Thread] = None

        # Shared state
        self._lock = threading.RLock()
        self._latest_frame: Optional[np.ndarray] = None
        self._frame_buffer: Deque[np.ndarray] = deque(
            maxlen=self.max_buffer_size
        )

        # Latest-frame analytics queue.
        # This intentionally stays tiny to avoid stale inference.
        self._analytics_condition = threading.Condition(
            self._lock
        )
        self._analytics_frame: Optional[np.ndarray] = None
        self._analytics_timestamp: Optional[float] = None

        # Analytics engine is lazy-loaded so merely constructing a
        # StreamWorker does not load YOLO/EasyOCR models.
        self._analytics_engine: Optional[AnalyticsEngine] = None
        self._analytics_lock = threading.Lock()

        # Event cooldown state:
        # {(event_type, camera_id): last_persist_time}
        self._event_last_seen: dict[tuple[str, str], float] = {}

        # Evidence directory
        self._evidence_dir = Path("evidence")
        self._evidence_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start capture and analytics background workers."""

        if (
            self._thread is not None
            and self._thread.is_alive()
        ):
            logger.warning(
                "Stream worker %s already running",
                self.camera_id,
            )
            return

        self._stop_event.clear()
        self._analytics_stop_event.clear()

        self._start_time = time.time()

        self._thread = threading.Thread(
            target=self._run_worker,
            name=f"stream-worker-{self.camera_id}",
            daemon=True,
        )

        self._analytics_thread = threading.Thread(
            target=self._run_analytics_worker,
            name=f"analytics-worker-{self.camera_id}",
            daemon=True,
        )

        self._thread.start()
        self._analytics_thread.start()

        logger.info(
            "Started stream worker for camera: %s",
            self.camera_id,
        )

    def stop(self, timeout: float = 3.0) -> None:
        """Stop capture and analytics workers cleanly."""

        logger.info(
            "Stopping stream worker for camera: %s",
            self.camera_id,
        )

        self._stop_event.set()
        self._analytics_stop_event.set()

        with self._analytics_condition:
            self._analytics_condition.notify_all()

        if (
            self._thread is not None
            and self._thread.is_alive()
        ):
            self._thread.join(timeout=timeout)

        if (
            self._analytics_thread is not None
            and self._analytics_thread.is_alive()
        ):
            self._analytics_thread.join(timeout=timeout)

        with self._lock:
            self.status = StreamStatus.OFFLINE

    def is_alive(self) -> bool:
        """Return whether the capture worker is alive."""

        return (
            self._thread is not None
            and self._thread.is_alive()
        )

    # ------------------------------------------------------------------
    # Frame access
    # ------------------------------------------------------------------

    def get_latest_frame(
        self,
    ) -> Optional[np.ndarray]:
        """Return a copy of the latest decoded frame."""

        with self._lock:
            if self._latest_frame is None:
                return None

            return self._latest_frame.copy()

    def get_latest_frame_jpeg(
        self,
        quality: int = 80,
    ) -> Optional[bytes]:
        """Encode the latest frame as JPEG."""

        if cv2 is None:
            return None

        frame = self.get_latest_frame()

        if frame is None:
            return None

        quality = max(1, min(100, int(quality)))

        success, encoded = cv2.imencode(
            ".jpg",
            frame,
            [
                int(cv2.IMWRITE_JPEG_QUALITY),
                quality,
            ],
        )

        if success:
            return encoded.tobytes()

        return None

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    def get_health(self) -> StreamHealth:
        """Calculate and return current stream health."""

        now = time.time()

        with self._lock:
            if (
                self.status == StreamStatus.ONLINE
                and self._last_frame_time is not None
                and (
                    now - self._last_frame_time
                    > self.stream_timeout_sec
                )
            ):
                self.status = StreamStatus.RECONNECTING
                self._last_error = (
                    "Stream read timed out "
                    f"(> {self.stream_timeout_sec}s)"
                )

            uptime = now - self._start_time

            resolution = (
                f"{self._width}x{self._height}"
                if self._width > 0
                else "0x0"
            )

            return StreamHealth(
                camera_id=self.camera_id,
                status=self.status,
                fps=round(
                    self._calculated_fps,
                    2,
                ),
                source_fps=round(
                    self._source_fps,
                    2,
                ),
                resolution=resolution,
                total_frames_read=self._total_frames,
                dropped_frames=self._dropped_frames,
                reconnect_count=self._reconnect_count,
                last_frame_timestamp=self._last_frame_datetime,
                last_error=self._last_error,
                uptime_seconds=round(
                    uptime,
                    2,
                ),
            )

    # ------------------------------------------------------------------
    # Capture
    # ------------------------------------------------------------------

    def _open_capture(self) -> Optional[object]:
        """Open the configured OpenCV video source."""

        if cv2 is None:
            self._last_error = (
                "OpenCV (cv2) is not installed"
            )
            self.status = StreamStatus.ERROR
            return None

        source = self.source_url

        if (
            self.source_type
            == StreamSourceType.WEBCAM
            and str(source).isdigit()
        ):
            source = int(source)

        logger.info(
            "Opening video source [%s] for %s",
            source,
            self.camera_id,
        )

        try:
            cap = cv2.VideoCapture(source)

            if self.source_type == StreamSourceType.RTSP:
                cap.set(
                    cv2.CAP_PROP_BUFFERSIZE,
                    2,
                )

            if not cap.isOpened():
                self._last_error = (
                    "Failed to open video source: "
                    f"{self.source_url}"
                )
                return None

            fps = cap.get(cv2.CAP_PROP_FPS)

            self._source_fps = (
                fps
                if fps and 0 < fps < 120
                else 25.0
            )

            self._width = int(
                cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            )

            self._height = int(
                cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            )

            self._last_error = None

            return cap

        except Exception as exc:
            self._last_error = (
                "VideoCapture initialization error: "
                f"{exc}"
            )

            logger.exception(
                "Error opening capture for %s",
                self.camera_id,
            )

            return None

    def _run_worker(self) -> None:
        """Main capture/reconnection loop."""

        reconnect_attempts = 0

        while not self._stop_event.is_set():
            cap = self._open_capture()

            if cap is None:
                reconnect_attempts += 1

                with self._lock:
                    self._reconnect_count += 1

                if (
                    reconnect_attempts
                    >= self.max_reconnect_attempts
                ):
                    self.status = StreamStatus.ERROR

                    logger.error(
                        "Max reconnect attempts (%d) "
                        "reached for %s",
                        self.max_reconnect_attempts,
                        self.camera_id,
                    )

                    break

                self.status = StreamStatus.RECONNECTING

                sleep_time = min(
                    self.reconnect_interval_sec
                    * (1.2 ** reconnect_attempts),
                    30.0,
                )

                logger.warning(
                    "Reconnect attempt %d/%d for %s "
                    "in %.1fs",
                    reconnect_attempts,
                    self.max_reconnect_attempts,
                    self.camera_id,
                    sleep_time,
                )

                self._sleep_interruptible(
                    sleep_time
                )

                continue

            reconnect_attempts = 0

            with self._lock:
                self.status = StreamStatus.ONLINE

            logger.info(
                "Camera %s is ONLINE (%dx%d @ %.1f FPS)",
                self.camera_id,
                self._width,
                self._height,
                self._source_fps,
            )

            if (
                self.source_type
                == StreamSourceType.FILE
                and self._source_fps > 0
            ):
                frame_delay = (
                    1.0 / self._source_fps
                )
            else:
                frame_delay = 0.001

            while not self._stop_event.is_set():
                frame_start_time = time.time()

                try:
                    ret, frame = cap.read()
                except Exception as exc:
                    logger.exception(
                        "Frame read failed for %s: %s",
                        self.camera_id,
                        exc,
                    )
                    ret = False
                    frame = None

                if not ret or frame is None:
                    if (
                        self.source_type
                        == StreamSourceType.FILE
                        and self.loop_video
                    ):
                        try:
                            cap.set(
                                cv2.CAP_PROP_POS_FRAMES,
                                0,
                            )

                            ret_retry, frame_retry = (
                                cap.read()
                            )

                            if (
                                ret_retry
                                and frame_retry is not None
                            ):
                                frame = frame_retry
                            else:
                                with self._lock:
                                    self._dropped_frames += 1

                                self.status = (
                                    StreamStatus.RECONNECTING
                                )
                                break

                        except Exception:
                            with self._lock:
                                self._dropped_frames += 1

                            self.status = (
                                StreamStatus.RECONNECTING
                            )
                            break

                    else:
                        with self._lock:
                            self._dropped_frames += 1

                        self.status = (
                            StreamStatus.RECONNECTING
                        )

                        self._last_error = (
                            "Frame read returned empty "
                            "or disconnected"
                        )

                        logger.warning(
                            "Stream disconnected or frame "
                            "read failed for %s",
                            self.camera_id,
                        )

                        break

                # ------------------------------------------------------
                # Valid frame
                # ------------------------------------------------------

                now = time.time()
                utc_now = datetime.now(timezone.utc)

                with self._analytics_condition:
                    self._latest_frame = frame.copy()
                    self._frame_buffer.append(
                        frame.copy()
                    )

                    self._total_frames += 1
                    self._last_frame_time = now
                    self._last_frame_datetime = utc_now

                    self._fps_window.append(now)

                    if len(self._fps_window) > 1:
                        time_span = (
                            self._fps_window[-1]
                            - self._fps_window[0]
                        )

                        if time_span > 0:
                            self._calculated_fps = (
                                len(self._fps_window) - 1
                            ) / time_span

                    # Replace stale analytics frame with the
                    # newest frame. This keeps inference real-time.
                    self._analytics_frame = frame.copy()
                    self._analytics_timestamp = now

                    self._analytics_condition.notify()

                # File pacing only affects capture pacing.
                elapsed = (
                    time.time()
                    - frame_start_time
                )

                wait_time = frame_delay - elapsed

                if wait_time > 0:
                    self._stop_event.wait(
                        wait_time
                    )

            try:
                cap.release()
            except Exception:
                pass

            if not self._stop_event.is_set():
                with self._lock:
                    self.status = (
                        StreamStatus.RECONNECTING
                    )
                    self._reconnect_count += 1

                self._sleep_interruptible(
                    self.reconnect_interval_sec
                )

        with self._lock:
            if self.status != StreamStatus.ERROR:
                self.status = StreamStatus.OFFLINE

        logger.info(
            "Stream worker for %s exited cleanly "
            "(status: %s)",
            self.camera_id,
            self.status,
        )

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------

    def _get_analytics_engine(
        self,
    ) -> AnalyticsEngine:
        """Lazy-create the analytics engine."""

        if self._analytics_engine is None:
            with self._analytics_lock:
                if self._analytics_engine is None:
                    logger.info(
                        "Initializing analytics engine "
                        "for camera %s",
                        self.camera_id,
                    )

                    self._analytics_engine = (
                        AnalyticsEngine()
                    )

                    logger.info(
                        "Analytics engine initialized "
                        "for camera %s",
                        self.camera_id,
                    )

        return self._analytics_engine

    def _run_analytics_worker(self) -> None:
        """
        Background analytics loop.

        This thread never controls capture timing.
        """

        while not self._analytics_stop_event.is_set():
            frame: Optional[np.ndarray] = None
            timestamp: Optional[float] = None

            with self._analytics_condition:
                if self._analytics_frame is None:
                    self._analytics_condition.wait(
                        timeout=0.5
                    )

                if (
                    self._analytics_stop_event.is_set()
                ):
                    break

                if self._analytics_frame is not None:
                    frame = self._analytics_frame
                    timestamp = (
                        self._analytics_timestamp
                    )

                    # Consume current frame.
                    self._analytics_frame = None
                    self._analytics_timestamp = None

            if frame is None:
                continue

            try:
                self._process_analytics_frame(
                    frame,
                    timestamp,
                )

            except Exception as exc:
                logger.exception(
                    "Analytics processing failed "
                    "for camera %s: %s",
                    self.camera_id,
                    exc,
                )

            # Avoid starving the capture worker and CPU.
            self._analytics_stop_event.wait(
                self.ANALYTICS_INTERVAL_SEC
            )

    def _process_analytics_frame(
        self,
        frame: np.ndarray,
        timestamp: Optional[float],
    ) -> None:
        """Run analytics and persist resulting events."""

        engine = self._get_analytics_engine()

        result = engine.process_frame(
            frame,
            timestamp=timestamp,
        )

        if not isinstance(result, dict):
            return

        events = result.get("events", [])

        if not events:
            return

        if not isinstance(events, list):
            return

        persistable_events = []

        now = time.time()

        for event in events:
            if not isinstance(event, dict):
                continue

            event_type = self._normalize_event_type(
                event
            )

            if not event_type:
                continue

            key = (
                self.camera_id,
                event_type,
            )

            last_seen = (
                self._event_last_seen.get(key)
            )

            if (
                last_seen is not None
                and now - last_seen
                < self.EVENT_COOLDOWN_SEC
            ):
                continue

            self._event_last_seen[key] = now
            persistable_events.append(event)

        if not persistable_events:
            return

        persisted = persist_analytics_events(
            camera_id=self.camera_id,
            events=persistable_events,
        )

        if not persisted:
            return

        for platform_event in persisted:
            self._save_event_evidence(
                frame,
                platform_event,
            )

        logger.info(
            "Camera %s generated %d platform event(s)",
            self.camera_id,
            len(persisted),
        )

    @staticmethod
    def _normalize_event_type(
        event: dict,
    ) -> str:
        """Extract and normalize an analytics event type."""

        value = (
            event.get("event_type")
            or event.get("type")
            or event.get("name")
            or event.get("event")
        )

        if value is None:
            return ""

        return (
            str(value)
            .strip()
            .lower()
            .replace(" ", "_")
        )

    # ------------------------------------------------------------------
    # Evidence
    # ------------------------------------------------------------------

    def _save_event_evidence(
        self,
        frame: np.ndarray,
        event: dict,
    ) -> Optional[str]:
        """Save an event evidence JPEG and return its path."""

        if cv2 is None:
            return None

        try:
            event_id = event.get(
                "id",
                "unknown",
            )

            timestamp = int(time.time() * 1000)

            safe_camera_id = (
                self.camera_id
                .replace("/", "_")
                .replace("\\", "_")
                .replace(" ", "_")
            )

            filename = (
                f"{safe_camera_id}_"
                f"event_{event_id}_"
                f"{timestamp}.jpg"
            )

            output_path = (
                self._evidence_dir / filename
            )

            success = cv2.imwrite(
                str(output_path),
                frame,
                [
                    int(cv2.IMWRITE_JPEG_QUALITY),
                    90,
                ],
            )

            if not success:
                logger.warning(
                    "Failed to save evidence for "
                    "camera %s",
                    self.camera_id,
                )
                return None

            logger.info(
                "Evidence saved for camera %s: %s",
                self.camera_id,
                output_path,
            )

            return str(output_path)

        except Exception as exc:
            logger.exception(
                "Evidence save failed for camera %s: %s",
                self.camera_id,
                exc,
            )

            return None

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def _sleep_interruptible(
        self,
        seconds: float,
    ) -> None:
        """Sleep while allowing immediate cancellation."""

        end_time = time.time() + seconds

        while (
            time.time() < end_time
            and not self._stop_event.is_set()
        ):
            remaining = (
                end_time - time.time()
            )

            self._stop_event.wait(
                min(0.1, max(0.0, remaining))
            )