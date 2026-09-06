from __future__ import annotations

from typing import Iterable

from backend.models.detection import DetectionResult


class VirtualFence:
    """Detect objects crossing a configured line."""

    def __init__(
        self,
        start: tuple[int, int],
        end: tuple[int, int],
    ) -> None:
        self.start = start
        self.end = end
        self.previous_side: dict[int, float] = {}

    @staticmethod
    def _cross_product(
        point: tuple[int, int],
        start: tuple[int, int],
        end: tuple[int, int],
    ) -> float:
        px, py = point
        sx, sy = start
        ex, ey = end

        return (ex - sx) * (py - sy) - (ey - sy) * (px - sx)

    def check(
        self,
        detections: Iterable[DetectionResult],
    ) -> list[dict]:
        events = []

        for detection in detections:
            if detection.track_id is None:
                continue

            center = (
                (detection.bbox.x1 + detection.bbox.x2) // 2,
                (detection.bbox.y1 + detection.bbox.y2) // 2,
            )

            side = self._cross_product(
                center,
                self.start,
                self.end,
            )

            previous = self.previous_side.get(
                detection.track_id
            )

            if previous is not None:
                crossed = (
                    (previous < 0 and side >= 0)
                    or (previous > 0 and side <= 0)
                )

                if crossed:
                    events.append(
                        {
                            "type": "virtual_fence_crossing",
                            "track_id": detection.track_id,
                            "class": detection.class_name,
                            "bbox": detection.bbox.to_dict(),
                        }
                    )

            self.previous_side[detection.track_id] = side

        return events