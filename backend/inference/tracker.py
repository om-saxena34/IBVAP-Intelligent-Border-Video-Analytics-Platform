from __future__ import annotations

from typing import Any

import numpy as np
from ultralytics import YOLO

from backend.models.detection import BoundingBox, DetectionResult


import os

DEFAULT_YOLO_MODEL = "yolov8n.pt" if os.path.exists("yolov8n.pt") else "yolo11n.pt"


class ObjectTracker:
    """YOLO ByteTrack-based object tracker."""

    def __init__(
        self,
        model_path: str = DEFAULT_YOLO_MODEL,
        confidence_threshold: float = 0.25,
    ) -> None:
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold

    def track(
        self,
        frame: np.ndarray,
    ) -> list[DetectionResult]:
        if frame is None or frame.size == 0:
            return []

        results = self.model.track(
            source=frame,
            conf=self.confidence_threshold,
            persist=True,
            tracker="bytetrack.yaml",
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

                if class_name not in YOLODetectorClasses:
                    continue

                confidence = float(box.conf[0])
                track_id = (
                    int(box.id[0])
                    if box.id is not None
                    else None
                )

                x1, y1, x2, y2 = box.xyxy[0].tolist()

                detections.append(
                    DetectionResult(
                        class_name=class_name,
                        confidence=confidence,
                        bbox=BoundingBox(
                            int(x1),
                            int(y1),
                            int(x2),
                            int(y2),
                        ),
                        track_id=track_id,
                    )
                )

        return detections


YOLODetectorClasses = {
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "bus",
    "truck",
    "train",
}
