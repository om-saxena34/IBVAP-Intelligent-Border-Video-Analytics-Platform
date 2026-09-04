"""
Pytest configuration and shared fixtures for IBVAP tests.
"""
import os
import tempfile
from typing import Generator
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.stream_manager import stream_manager

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None


@pytest.fixture(autouse=True)
def cleanup_streams():
    """Ensure all background stream workers are stopped and cleaned up after each test."""
    yield
    stream_manager.shutdown_all()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def sample_mp4_video() -> Generator[str, None, None]:
    """
    Generate a temporary synthetic MP4 video file with moving patterns for tests.
    Yields the file path, and cleans it up after the test session.
    """
    if cv2 is None or np is None:
        pytest.skip("cv2/numpy not installed; skipping real video generation fixture")

    temp_dir = tempfile.mkdtemp(prefix="ibvap_test_video_")
    video_path = os.path.join(temp_dir, "test_synthetic.mp4")

    width, height, fps, total_frames = 320, 240, 15, 45
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

    try:
        for i in range(total_frames):
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            # Draw moving rectangle simulating border patrol / vehicle movement
            x = int((i * 5) % (width - 60))
            y = int((height // 2) - 20)
            cv2.rectangle(frame, (x, y), (x + 60, y + 40), (0, 255, 120), -1)
            cv2.putText(
                frame,
                f"IBVAP FRAME {i:03d}",
                (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                1,
            )
            writer.write(frame)
    finally:
        writer.release()

    yield video_path

    # Teardown
    try:
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)
    except Exception:
        pass
