from __future__ import annotations

import cv2
import numpy as np

from backend.models.detection import DetectionResult


class NightMovementDetector:
    """Detect movement during low-light conditions."""

    def __init__(
        self,
        brightness_threshold: float = 60.0,
    ) -> None:
        self.brightness_threshold = brightness_threshold
        self.previous_centers: dict[int, tuple[int, int]] = {}

    def update(
        self,
        frame: np.ndarray,
        detections: list[DetectionResult],
    ) -> list[dict]:
        if frame is None or frame.size == 0:
            return []

        gray = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2GRAY,
        )

        brightness = float(np.mean(gray))

        if brightness >= self.brightness_threshold:
            return []

        events = []

        for detection in detections:
            if detection.track_id is None:
                continue

            center = (
                (
                    detection.bbox.x1
                    + detection.bbox.x2
                )
                // 2,
                (
                    detection.bbox.y1
                    + detection.bbox.y2
                )
                // 2,
            )

            previous = self.previous_centers.get(
                detection.track_id
            )

            if previous is not None and center != previous:
                events.append(
                    {
                        "type": "night_movement",
                        "track_id": detection.track_id,
                        "class": detection.class_name,
                        "brightness": brightness,
                    }
                )

            self.previous_centers[
                detection.track_id
            ] = center

        return events