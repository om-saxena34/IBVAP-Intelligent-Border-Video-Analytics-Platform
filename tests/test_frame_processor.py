"""Unit tests for Phase 2 OpenCV frame normalization."""
import numpy as np
import pytest

from backend.services.frame_processor import FrameProcessor


def test_bgr_frame_is_normalized_and_contiguous():
    frame = np.zeros((10, 20, 3), dtype=np.uint8)
    result = FrameProcessor.process(frame)
    assert result.shape == (10, 20, 3)
    assert result.dtype == np.uint8
    assert result.flags["C_CONTIGUOUS"]


def test_grayscale_frame_becomes_bgr():
    frame = np.zeros((10, 20), dtype=np.uint8)
    result = FrameProcessor.process(frame)
    assert result.shape == (10, 20, 3)


def test_bgra_frame_becomes_bgr():
    frame = np.zeros((10, 20, 4), dtype=np.uint8)
    result = FrameProcessor.process(frame)
    assert result.shape == (10, 20, 3)


def test_empty_frame_is_rejected():
    with pytest.raises(ValueError, match="empty"):
        FrameProcessor.process(np.empty((0, 0, 3), dtype=np.uint8))


def test_unsupported_frame_shape_is_rejected():
    with pytest.raises(ValueError, match="Unsupported frame shape"):
        FrameProcessor.process(np.zeros((10, 20, 2), dtype=np.uint8))
