from __future__ import annotations

import logging
import time
from typing import Any

import numpy as np

from backend.analytics.group_movement import GroupMovementDetector
from backend.analytics.loitering import LoiteringDetector
from backend.analytics.night_movement import NightMovementDetector
from backend.analytics.restricted_zone import RestrictedZoneDetector
from backend.analytics.virtual_fence import VirtualFence
from backend.analytics.wrong_direction import WrongDirectionDetector
from backend.inference.anpr import ANPR
from backend.inference.face_detector import FaceDetector
from backend.inference.tracker import ObjectTracker


logger = logging.getLogger("ibvap.analytics_engine")


class AnalyticsEngine:
    """
    Unified IBVAP video analytics pipeline.

    Pipeline:

        Frame
          ↓
        Object Tracking
          ↓
        ├── Virtual Fence
        ├── Restricted Zone
        ├── Loitering
        ├── Night Movement
        ├── Wrong Direction
        └── Group Movement
          ↓
        Face Detection
          ↓
        ANPR
          ↓
        Unified Analytics Result
    """

    def __init__(
        self,
        model_path: str = "yolo11n.pt",
        confidence_threshold: float = 0.25,
        fence: tuple[tuple[int, int], tuple[int, int]] | None = None,
        restricted_zone: list[tuple[int, int]] | None = None,
        expected_direction: tuple[float, float] | None = None,
        loitering_seconds: float = 30.0,
    ) -> None:

        if not 0.0 <= confidence_threshold <= 1.0:
            raise ValueError(
                "confidence_threshold must be between 0 and 1"
            )

        if loitering_seconds < 0:
            raise ValueError(
                "loitering_seconds must be >= 0"
            )

        # ---------------------------------------------------------
        # Core inference
        # ---------------------------------------------------------

        self.tracker = ObjectTracker(
            model_path=model_path,
            confidence_threshold=confidence_threshold,
        )

        self.face_detector = FaceDetector()
        self.anpr = ANPR()

        # ---------------------------------------------------------
        # Analytics detectors
        # ---------------------------------------------------------

        self.fence_detector = (
            VirtualFence(*fence)
            if fence is not None
            else None
        )

        self.restricted_zone_detector = (
            RestrictedZoneDetector(restricted_zone)
            if restricted_zone is not None
            else None
        )

        self.loitering_detector = LoiteringDetector(
            threshold_seconds=loitering_seconds,
        )

        self.night_detector = NightMovementDetector()

        self.direction_detector = (
            WrongDirectionDetector(expected_direction)
            if expected_direction is not None
            else None
        )

        self.group_detector = GroupMovementDetector()

        logger.info(
            "AnalyticsEngine initialized "
            "(confidence=%.2f, loitering=%.1fs, "
            "fence=%s, restricted_zone=%s, "
            "direction=%s)",
            confidence_threshold,
            loitering_seconds,
            fence is not None,
            restricted_zone is not None,
            expected_direction is not None,
        )

    # ------------------------------------------------------------------
    # Main processing pipeline
    # ------------------------------------------------------------------

    def process_frame(
        self,
        frame: np.ndarray,
        timestamp: float | None = None,
    ) -> dict[str, Any]:
        """
        Process a single video frame through the complete analytics stack.

        Returns a stable dictionary suitable for:
            - API responses
            - event generation
            - alert generation
            - frontend dashboard
            - evidence processing
        """

        if frame is None or frame.size == 0:
            return self._empty_result(
                timestamp=timestamp,
            )

        if timestamp is None:
            timestamp = time.time()

        # ---------------------------------------------------------
        # 1. Object detection + tracking
        # ---------------------------------------------------------

        detections = self.tracker.track(frame)

        events: list[dict[str, Any]] = []

        # ---------------------------------------------------------
        # 2. Virtual fence
        # ---------------------------------------------------------

        if self.fence_detector is not None:
            try:
                fence_events = self.fence_detector.check(
                    detections
                )

                events.extend(
                    self._normalize_events(
                        fence_events,
                        default_type="virtual_fence",
                    )
                )

            except Exception:
                logger.exception(
                    "Virtual fence processing failed"
                )

        # ---------------------------------------------------------
        # 3. Restricted zone
        # ---------------------------------------------------------

        if self.restricted_zone_detector is not None:
            try:
                restricted_events = (
                    self.restricted_zone_detector.check(
                        detections
                    )
                )

                events.extend(
                    self._normalize_events(
                        restricted_events,
                        default_type="restricted_zone",
                    )
                )

            except Exception:
                logger.exception(
                    "Restricted-zone processing failed"
                )

        # ---------------------------------------------------------
        # 4. Loitering
        # ---------------------------------------------------------

        try:
            loitering_events = (
                self.loitering_detector.update(
                    detections,
                    now=timestamp,
                )
            )

            events.extend(
                self._normalize_events(
                    loitering_events,
                    default_type="loitering",
                )
            )

        except Exception:
            logger.exception(
                "Loitering processing failed"
            )

        # ---------------------------------------------------------
        # 5. Night movement
        # ---------------------------------------------------------

        try:
            night_events = self.night_detector.update(
                frame,
                detections,
            )

            events.extend(
                self._normalize_events(
                    night_events,
                    default_type="night_movement",
                )
            )

        except Exception:
            logger.exception(
                "Night movement processing failed"
            )

        # ---------------------------------------------------------
        # 6. Wrong direction
        # ---------------------------------------------------------

        if self.direction_detector is not None:
            try:
                direction_events = (
                    self.direction_detector.update(
                        detections
                    )
                )

                events.extend(
                    self._normalize_events(
                        direction_events,
                        default_type="wrong_direction",
                    )
                )

            except Exception:
                logger.exception(
                    "Wrong-direction processing failed"
                )

        # ---------------------------------------------------------
        # 7. Group movement
        # ---------------------------------------------------------

        try:
            group_events = self.group_detector.detect(
                detections
            )

            events.extend(
                self._normalize_events(
                    group_events,
                    default_type="group_movement",
                )
            )

        except Exception:
            logger.exception(
                "Group movement processing failed"
            )

        # ---------------------------------------------------------
        # 8. Face detection
        # ---------------------------------------------------------

        faces: list[dict[str, Any]] = []

        try:
            faces = self.face_detector.detect(frame)

        except Exception:
            logger.exception(
                "Face detection failed"
            )

        # ---------------------------------------------------------
        # 9. ANPR
        # ---------------------------------------------------------

        plates: list[dict[str, Any]] = []

        try:
            plates = self.anpr.read(frame)

        except Exception:
            logger.exception(
                "ANPR processing failed"
            )

        # ---------------------------------------------------------
        # 10. Unified result
        # ---------------------------------------------------------

        return {
            "timestamp": float(timestamp),

            "detections": [
                detection.to_dict()
                for detection in detections
            ],

            "faces": faces,

            "plates": plates,

            "events": events,

            "summary": {
                "detections": len(detections),
                "faces": len(faces),
                "plates": len(plates),
                "events": len(events),
            },
        }

    # ------------------------------------------------------------------
    # Event normalization
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_events(
        events: Any,
        default_type: str,
    ) -> list[dict[str, Any]]:
        """
        Normalize detector outputs into a consistent event format.

        Existing analytics modules may return dictionaries with
        different event-name keys. This method keeps the engine's
        external result format consistent.
        """

        if events is None:
            return []

        if isinstance(events, dict):
            events = [events]

        if not isinstance(events, (list, tuple)):
            return []

        normalized: list[dict[str, Any]] = []

        for event in events:
            if isinstance(event, dict):
                item = dict(event)

                event_type = (
                    item.get("event_type")
                    or item.get("type")
                    or item.get("name")
                    or default_type
                )

                item["event_type"] = str(
                    event_type
                ).strip().lower().replace(" ", "_")

                item.setdefault(
                    "source",
                    "analytics",
                )

                normalized.append(item)

            elif isinstance(event, str):
                normalized.append(
                    {
                        "event_type": event
                        .strip()
                        .lower()
                        .replace(" ", "_"),
                        "source": "analytics",
                    }
                )

        return normalized

    # ------------------------------------------------------------------
    # Empty result
    # ------------------------------------------------------------------

    @staticmethod
    def _empty_result(
        timestamp: float | None = None,
    ) -> dict[str, Any]:
        """
        Return a stable empty analytics result.
        """

        if timestamp is None:
            timestamp = time.time()

        return {
            "timestamp": float(timestamp),
            "detections": [],
            "faces": [],
            "plates": [],
            "events": [],
            "summary": {
                "detections": 0,
                "faces": 0,
                "plates": 0,
                "events": 0,
            },
        }