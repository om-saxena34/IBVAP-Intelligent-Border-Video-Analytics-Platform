from __future__ import annotations

import math

from backend.models.detection import DetectionResult


class GroupMovementDetector:
    """Detect nearby tracked objects moving together."""

    def __init__(
        self,
        distance_threshold: float = 120.0,
        minimum_group_size: int = 3,
    ) -> None:
        self.distance_threshold = distance_threshold
        self.minimum_group_size = minimum_group_size

    @staticmethod
    def _center(
        detection: DetectionResult,
    ) -> tuple[int, int]:
        return (
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

    def detect(
        self,
        detections: list[DetectionResult],
    ) -> list[dict]:
        tracked = [
            d
            for d in detections
            if d.track_id is not None
        ]

        groups = []

        for detection in tracked:
            center = self._center(detection)

            nearby = [
                other
                for other in tracked
                if other.track_id != detection.track_id
                and math.dist(
                    center,
                    self._center(other),
                )
                <= self.distance_threshold
            ]

            members = [detection, *nearby]

            unique_ids = {
                member.track_id
                for member in members
            }

            if len(unique_ids) >= self.minimum_group_size:
                groups.append(
                    {
                        "type": "group_movement",
                        "track_ids": sorted(unique_ids),
                        "size": len(unique_ids),
                    }
                )

        return groups
    