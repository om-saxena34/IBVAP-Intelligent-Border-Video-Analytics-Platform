from __future__ import annotations

import time

from backend.models.detection import DetectionResult


class LoiteringDetector:
    """Detect tracked objects remaining in an area too long."""

    def __init__(
        self,
        threshold_seconds: float = 30.0,
    ) -> None:
        self.threshold_seconds = threshold_seconds
        self.first_seen: dict[int, float] = {}
        self.alerted: set[int] = set()

    def update(
        self,
        detections: list[DetectionResult],
        now: float | None = None,
    ) -> list[dict]:
        current_time = time.monotonic() if now is None else now
        events = []

        active_ids = set()

        for detection in detections:
            if detection.track_id is None:
                continue

            track_id = detection.track_id
            active_ids.add(track_id)

            self.first_seen.setdefault(
                track_id,
                current_time,
            )

            duration = (
                current_time - self.first_seen[track_id]
            )

            if (
                duration >= self.threshold_seconds
                and track_id not in self.alerted
            ):
                self.alerted.add(track_id)

                events.append(
                    {
                        "type": "loitering",
                        "track_id": track_id,
                        "class": detection.class_name,
                        "duration_seconds": duration,
                    }
                )

        stale_ids = set(self.first_seen) - active_ids

        for track_id in stale_ids:
            self.first_seen.pop(track_id, None)
            self.alerted.discard(track_id)

        return events