from __future__ import annotations

import math

from backend.models.detection import DetectionResult


class WrongDirectionDetector:
    """Detect movement opposite to configured direction."""

    def __init__(
        self,
        expected_direction: tuple[float, float],
        minimum_distance: float = 5.0,
    ) -> None:
        dx, dy = expected_direction
        magnitude = math.hypot(dx, dy)

        if magnitude == 0:
            raise ValueError(
                "expected_direction cannot be zero"
            )

        self.expected = (
            dx / magnitude,
            dy / magnitude,
        )
        self.minimum_distance = minimum_distance
        self.previous: dict[
            int,
            tuple[int, int],
        ] = {}

    def update(
        self,
        detections: list[DetectionResult],
    ) -> list[dict]:
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

            previous = self.previous.get(
                detection.track_id
            )

            if previous is not None:
                dx = center[0] - previous[0]
                dy = center[1] - previous[1]

                distance = math.hypot(dx, dy)

                if distance >= self.minimum_distance:
                    movement = (
                        dx / distance,
                        dy / distance,
                    )

                    dot = (
                        movement[0] * self.expected[0]
                        + movement[1] * self.expected[1]
                    )

                    if dot < -0.5:
                        events.append(
                            {
                                "type": "wrong_direction",
                                "track_id": detection.track_id,
                                "class": detection.class_name,
                            }
                        )

            self.previous[
                detection.track_id
            ] = center

        return events