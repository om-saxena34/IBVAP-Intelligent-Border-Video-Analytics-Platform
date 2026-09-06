"""
OpenCV frame normalization and processing helpers for IBVAP.

Phase 2 keeps decoded frame content intact while normalizing frames into a
predictable BGR uint8 representation for downstream computer-vision stages.
"""
from typing import Optional

import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None  # type: ignore


class FrameProcessor:
    """Validate and normalize decoded OpenCV frames before buffering."""

    @staticmethod
    def process(frame: Optional[np.ndarray]) -> np.ndarray:
        """Return a valid, contiguous BGR uint8 frame or raise ValueError."""
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            raise ValueError("Decoded frame is empty")

        if frame.ndim == 2:
            if cv2 is None:
                raise ValueError("OpenCV is required to normalize grayscale frames")
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        elif frame.ndim == 3 and frame.shape[2] == 4:
            if cv2 is None:
                raise ValueError("OpenCV is required to normalize BGRA frames")
            frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
        elif frame.ndim != 3 or frame.shape[2] != 3:
            raise ValueError(f"Unsupported frame shape: {frame.shape}")

        if frame.dtype != np.uint8:
            frame = np.clip(frame, 0, 255).astype(np.uint8)

        return np.ascontiguousarray(frame)
