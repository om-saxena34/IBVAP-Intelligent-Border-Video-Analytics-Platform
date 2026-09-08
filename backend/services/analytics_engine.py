from __future__ import annotations

import logging
import time
from typing import Any

import numpy as np

from backend.analytics.group_movement import GroupMovementDetector
from backend.analytics.loitering import LoiteringDetector
from backend.analytics.night_movement import NightMovementDetector
from backend.analytics.restricted_zone import RestrictedZoneDetector
from backend.analytics.suspicious_activity import SuspiciousActivityScorer
from backend.analytics.virtual_fence import VirtualFence
from backend.analytics.wrong_direction import WrongDirectionDetector
from backend.inference.anpr import ANPR
from backend.inference.face_detector import FaceDetector
from backend.inference.tracker import ObjectTracker, DEFAULT_YOLO_MODEL


logger = logging.getLogger("ibvap.analytics_engine")


class AnalyticsEngine:
    """
    Unified IBVAP video analytics pipeline.

    Pipeline:
        Frame
          ↓
        Object Tracking (YOLO + ByteTrack)
          ↓
        ├── Virtual Fence Crossing
        ├── Restricted Zone Entry
        ├── Loitering Detection
        ├── Night Movement Detection
        ├── Wrong Direction Movement
        └── Group Movement Detection
          ↓
        Face Detection (Haar Cascade)
          ↓
        Crop-based ANPR (EasyOCR)
          ↓
        Suspicious Activity Composite Scoring
          ↓
        Unified Analytics Result
    """

    # Sensible defaults tailored for 480x848 CCTV surveillance feed
    DEFAULT_FENCE = ((340, 150), (340, 650))
    DEFAULT_RESTRICTED_ZONE = [
        (180, 260),
        (360, 260),
        (360, 500),
        (180, 500),
    ]
    DEFAULT_DIRECTION = (1.0, 0.0)

    def __init__(
        self,
        model_path: str = DEFAULT_YOLO_MODEL,
        confidence_threshold: float = 0.25,
        fence: tuple[tuple[int, int], tuple[int, int]] | None = None,
        restricted_zone: list[tuple[int, int]] | None = None,
        expected_direction: tuple[float, float] | None = None,
        loitering_seconds: float = 15.0,
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
        # Analytics detectors & zones
        # ---------------------------------------------------------
        self.fence = fence if fence is not None else self.DEFAULT_FENCE
        self.restricted_zone = restricted_zone if restricted_zone is not None else self.DEFAULT_RESTRICTED_ZONE
        self.expected_direction = expected_direction if expected_direction is not None else self.DEFAULT_DIRECTION
        self.loitering_seconds = loitering_seconds

        self.fence_detector = VirtualFence(*self.fence)
        self.restricted_zone_detector = RestrictedZoneDetector(self.restricted_zone)
        self.loitering_detector = LoiteringDetector(threshold_seconds=loitering_seconds)
        self.night_detector = NightMovementDetector()
        self.direction_detector = WrongDirectionDetector(self.expected_direction)
        self.group_detector = GroupMovementDetector()
        self.suspicious_scorer = SuspiciousActivityScorer()

        self._frame_count = 0

        logger.info(
            "AnalyticsEngine initialized "
            "(confidence=%.2f, loitering=%.1fs, "
            "fence=%s, restricted_zone=%s, "
            "direction=%s)",
            confidence_threshold,
            loitering_seconds,
            self.fence is not None,
            self.restricted_zone is not None,
            self.expected_direction is not None,
        )

    def update_zones(
        self,
        fence: tuple[tuple[int, int], tuple[int, int]] | None = None,
        restricted_zone: list[tuple[int, int]] | None = None,
    ) -> None:
        """Dynamically update virtual fence and restricted zone geometry."""
        if fence is not None:
            self.fence = fence
            self.fence_detector = VirtualFence(*fence)

        if restricted_zone is not None and len(restricted_zone) >= 3:
            self.restricted_zone = restricted_zone
            self.restricted_zone_detector = RestrictedZoneDetector(restricted_zone)

        logger.info("Updated camera zones: fence=%s, zone=%s", self.fence, self.restricted_zone)

    def get_capabilities_status(self) -> dict[str, dict[str, Any]]:
        """Return real operational status for all analytical capabilities."""
        return {
            "object_detection": {
                "name": "Object Detection",
                "model": "YOLOv8 Nano" if "yolov8" in DEFAULT_YOLO_MODEL else "YOLO11 Nano",
                "status": "active",
                "type": "model",
            },
            "tracking": {
                "name": "Object Tracking",
                "model": "ByteTrack",
                "status": "active",
                "type": "model",
            },
            "virtual_fence": {
                "name": "Virtual Fence",
                "status": "active" if self.fence_detector is not None else "disabled",
                "type": "rule",
            },
            "restricted_zone": {
                "name": "Restricted Zone",
                "status": "active" if self.restricted_zone_detector is not None else "disabled",
                "type": "rule",
            },
            "loitering": {
                "name": "Loitering Detection",
                "status": "active",
                "threshold_seconds": self.loitering_seconds,
                "type": "rule",
            },
            "night_movement": {
                "name": "Night Movement",
                "status": "active",
                "type": "rule",
            },
            "wrong_direction": {
                "name": "Wrong Direction",
                "status": "active" if self.direction_detector is not None else "disabled",
                "type": "rule",
            },
            "group_movement": {
                "name": "Group Movement",
                "status": "active",
                "type": "rule",
            },
            "anpr": {
                "name": "License Plate Recognition (ANPR)",
                "status": "active" if self.anpr.available else "standby",
                "type": "model",
            },
            "face_detection": {
                "name": "Face Detection",
                "status": "active",
                "type": "model",
            },
            "suspicious_activity": {
                "name": "Suspicious Activity Scoring",
                "status": "active",
                "type": "composite_rule",
            },
        }

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
        """
        if frame is None or frame.size == 0:
            return self._empty_result(timestamp=timestamp)

        if timestamp is None:
            timestamp = time.time()

        self._frame_count += 1

        # ---------------------------------------------------------
        # 1. Object detection + tracking
        # ---------------------------------------------------------
        detections = self.tracker.track(frame)
        active_track_ids = {d.track_id for d in detections if d.track_id is not None}

        events: list[dict[str, Any]] = []

        # ---------------------------------------------------------
        # 2. Virtual fence
        # ---------------------------------------------------------
        if self.fence_detector is not None:
            try:
                fence_events = self.fence_detector.check(detections)
                events.extend(
                    self._normalize_events(
                        fence_events,
                        default_type="virtual_fence",
                    )
                )
            except Exception:
                logger.exception("Virtual fence processing failed")

        # ---------------------------------------------------------
        # 3. Restricted zone
        # ---------------------------------------------------------
        if self.restricted_zone_detector is not None:
            try:
                restricted_events = self.restricted_zone_detector.check(detections)
                events.extend(
                    self._normalize_events(
                        restricted_events,
                        default_type="restricted_zone",
                    )
                )
            except Exception:
                logger.exception("Restricted-zone processing failed")

        # ---------------------------------------------------------
        # 4. Loitering
        # ---------------------------------------------------------
        try:
            loitering_events = self.loitering_detector.update(
                detections,
                now=timestamp,
            )
            events.extend(
                self._normalize_events(
                    loitering_events,
                    default_type="loitering",
                )
            )
        except Exception:
            logger.exception("Loitering processing failed")

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
            logger.exception("Night movement processing failed")

        # ---------------------------------------------------------
        # 6. Wrong direction
        # ---------------------------------------------------------
        if self.direction_detector is not None:
            try:
                direction_events = self.direction_detector.update(detections)
                events.extend(
                    self._normalize_events(
                        direction_events,
                        default_type="wrong_direction",
                    )
                )
            except Exception:
                logger.exception("Wrong-direction processing failed")

        # ---------------------------------------------------------
        # 7. Group movement
        # ---------------------------------------------------------
        try:
            group_events = self.group_detector.detect(detections)
            events.extend(
                self._normalize_events(
                    group_events,
                    default_type="group_movement",
                )
            )
        except Exception:
            logger.exception("Group movement processing failed")

        # ---------------------------------------------------------
        # 8. Face detection (on persons or periodic)
        # ---------------------------------------------------------
        faces: list[dict[str, Any]] = []
        persons = [d for d in detections if d.class_name == "person"]
        if persons or self._frame_count % 30 == 0:
            try:
                faces = self.face_detector.detect(frame)
            except Exception:
                logger.exception("Face detection failed")

        # ---------------------------------------------------------
        # 9. Crop-based ANPR (on vehicles only, cached)
        # ---------------------------------------------------------
        plates: list[dict[str, Any]] = []
        vehicles = [
            d for d in detections
            if d.class_name in {"car", "truck", "bus", "motorcycle"}
        ]
        if vehicles:
            try:
                plates = self.anpr.read_vehicle_crops(frame, vehicles)
            except Exception:
                logger.exception("ANPR crop processing failed")

        # ---------------------------------------------------------
        # 10. Suspicious Activity Multi-Signal Scorer
        # ---------------------------------------------------------
        try:
            suspicious_events = self.suspicious_scorer.update(
                events,
                active_track_ids=active_track_ids,
                now=timestamp,
            )
            events.extend(
                self._normalize_events(
                    suspicious_events,
                    default_type="suspicious_activity",
                )
            )
        except Exception:
            logger.exception("Suspicious activity scoring failed")

        # Determine overall threat score across active tracks
        threat_score = 0
        threat_level = "NORMAL"
        for tid in active_track_ids:
            score, lvl, _ = self.suspicious_scorer.score_track(tid)
            if score > threat_score:
                threat_score = score
                threat_level = lvl

        # If any CRITICAL event occurred in this frame
        if any(e.get("event_type") in {"restricted_zone", "restricted_zone_entry", "suspicious_activity"} for e in events):
            threat_score = max(threat_score, 75)
            threat_level = "CRITICAL" if threat_score >= 85 else "HIGH"

        # ---------------------------------------------------------
        # 11. Unified result
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
            "threat_score": threat_score,
            "threat_level": threat_level,
            "summary": {
                "detections": len(detections),
                "faces": len(faces),
                "plates": len(plates),
                "events": len(events),
                "threat_score": threat_score,
                "threat_level": threat_level,
                "persons": len(persons),
                "vehicles": len(vehicles),
            },
            "capabilities": self.get_capabilities_status(),
            "fence": self.fence,
            "restricted_zone": self.restricted_zone,
        }

    # ------------------------------------------------------------------
    # Event normalization
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_events(
        events: Any,
        default_type: str,
    ) -> list[dict[str, Any]]:
        """Normalize detector outputs into a consistent event format."""
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
                item.setdefault("source", "analytics")
                normalized.append(item)

            elif isinstance(event, str):
                normalized.append(
                    {
                        "event_type": event.strip().lower().replace(" ", "_"),
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
        """Return a stable empty analytics result."""
        if timestamp is None:
            timestamp = time.time()

        return {
            "timestamp": float(timestamp),
            "detections": [],
            "faces": [],
            "plates": [],
            "events": [],
            "threat_score": 0,
            "threat_level": "NORMAL",
            "summary": {
                "detections": 0,
                "faces": 0,
                "plates": 0,
                "events": 0,
                "threat_score": 0,
                "threat_level": "NORMAL",
                "persons": 0,
                "vehicles": 0,
            },
            "capabilities": {},
            "fence": None,
            "restricted_zone": None,
        }
