from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class BoundingBox:
    x1: int
    y1: int
    x2: int
    y2: int

    def to_dict(self) -> dict[str, int]:
        return {
            "x1": self.x1,
            "y1": self.y1,
            "x2": self.x2,
            "y2": self.y2,
        }


@dataclass(frozen=True)
class DetectionResult:
    class_name: str
    confidence: float
    bbox: BoundingBox
    track_id: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "class": self.class_name,
            "class_name": self.class_name,
            "confidence": self.confidence,
            "bbox": self.bbox.to_dict(),
            "track_id": self.track_id,
        }
