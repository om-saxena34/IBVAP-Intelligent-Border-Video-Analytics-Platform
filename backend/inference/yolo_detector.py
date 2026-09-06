from __future__ import annotations

from typing import Any

import numpy as np
from ultralytics import YOLO

from backend.models.detection import BoundingBox, DetectionResult


class YOLODetector:
    """YOLO-based person and vehicle detector."""

    TARGET_CLASSES = {
        "person",
        "bicycle",
        "car",
        "motorcycle",
        "bus",
        "truck",
        "train",
    }

    def __init__(
        self,
        model_path: str = "yolo11n.pt",
        confidence_threshold: float = 0.25,
    ) -> None:
        if not 0.0 <= confidence_threshold <= 1.0:
            raise ValueError(
                "confidence_threshold must be between 0 and 1"
            )

        self.confidence_threshold = confidence_threshold
        self.model = YOLO(model_path)

    def detect(
        self,
        frame: np.ndarray,
    ) -> list[DetectionResult]:
        if frame is None or frame.size == 0:
            return []

        results = self.model.predict(
            source=frame,
            conf=self.confidence_threshold,
            verbose=False,
        )

        detections: list[DetectionResult] = []

        for result in results:
            if result.boxes is None:
                continue

            names = result.names

            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = str(names[class_id])

                if class_name not in self.TARGET_CLASSES:
                    continue

                confidence = float(box.conf[0])

                x1, y1, x2, y2 = box.xyxy[0].tolist()

                detections.append(
                    DetectionResult(
                        class_name=class_name,
                        confidence=confidence,
                        bbox=BoundingBox(
                            x1=int(x1),
                            y1=int(y1),
                            x2=int(x2),
                            y2=int(y2),
                        ),
                    )
                )

        return detections

    def detect_as_dict(
        self,
        frame: np.ndarray,
    ) -> list[dict[str, Any]]:
        return [
            detection.to_dict()
            for detection in self.detect(frame)
        ]