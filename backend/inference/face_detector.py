from __future__ import annotations

import cv2
import numpy as np


class FaceDetector:
    """OpenCV Haar-cascade face detector."""

    def __init__(self) -> None:
        cascade_path = cv2.data.haarcascades + (
            "haarcascade_frontalface_default.xml"
        )

        self.detector = cv2.CascadeClassifier(cascade_path)

        if self.detector.empty():
            raise RuntimeError("Failed to load face detector")

    def detect(self, frame: np.ndarray) -> list[dict]:
        if frame is None or frame.size == 0:
            return []

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = self.detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
        )

        results = []

        for x, y, width, height in faces:
            results.append(
                {
                    "class": "face",
                    "bbox": {
                        "x1": int(x),
                        "y1": int(y),
                        "x2": int(x + width),
                        "y2": int(y + height),
                    },
                }
            )

        return results