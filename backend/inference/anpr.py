from __future__ import annotations

import re

import cv2
import easyocr
import numpy as np


class ANPR:
    """License-plate OCR pipeline."""

    def __init__(self) -> None:
        self.reader = easyocr.Reader(
            ["en"],
            gpu=False,
            verbose=False,
        )

    def read(self, frame: np.ndarray) -> list[dict]:
        if frame is None or frame.size == 0:
            return []

        results = self.reader.readtext(frame)

        plates = []

        for bbox, text, confidence in results:
            normalized = re.sub(
                r"[^A-Z0-9]",
                "",
                text.upper(),
            )

            if not normalized:
                continue

            xs = [int(point[0]) for point in bbox]
            ys = [int(point[1]) for point in bbox]

            plates.append(
                {
                    "text": normalized,
                    "confidence": float(confidence),
                    "bbox": {
                        "x1": min(xs),
                        "y1": min(ys),
                        "x2": max(xs),
                        "y2": max(ys),
                    },
                }
            )

        return plates