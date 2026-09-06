from __future__ import annotations

import cv2
import numpy as np

from backend.models.detection import DetectionResult


class RestrictedZoneDetector:
    """Detect objects whose center enters a polygon zone."""

    def __init__(
        self,
        polygon: list[tuple[int, int]],
    ) -> None:
        if len(polygon) < 3:
            raise ValueError(
                "Restricted zone requires at least 3 points"
            )

        self.polygon = np.array(
            polygon,
            dtype=np.int32,
        )

    def check(
        self,
        detections: list[DetectionResult],
    ) -> list[dict]:
        events = []

        for detection in detections:
            center_x = (
                detection.bbox.x1 + detection.bbox.x2
            ) // 2

            center_y = (
                detection.bbox.y1 + detection.bbox.y2
            ) // 2

            inside = cv2.pointPolygonTest(
                self.polygon,
                (center_x, center_y),
                False,
            )

            if inside >= 0:
                events.append(
                    {
                        "type": "restricted_zone_entry",
                        "track_id": detection.track_id,
                        "class": detection.class_name,
                        "bbox": detection.bbox.to_dict(),
                    }
                )

        return events