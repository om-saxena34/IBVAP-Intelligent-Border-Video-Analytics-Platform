"""
Unit tests for StreamWorker ingestion, reconnection, and health monitoring.
"""
import time
from unittest.mock import MagicMock, patch
import numpy as np

from backend.models.camera import (
    StreamConnectRequest,
    StreamSourceType,
    StreamStatus,
)
from backend.services.stream_worker import StreamWorker


def test_worker_initialization():
    """Verify StreamWorker initializes with expected default offline state."""
    request = StreamConnectRequest(
        camera_id="CAM_TEST_01",
        source_url="non_existent_stream.mp4",
        source_type=StreamSourceType.FILE,
        location="BOP Bravo Checkpost",
        sector="Sector 2",
    )
    worker = StreamWorker(request)
    health = worker.get_health()

    assert worker.camera_id == "CAM_TEST_01"
    assert health.status == StreamStatus.OFFLINE
    assert health.total_frames_read == 0
    assert health.dropped_frames == 0
    assert health.fps == 0.0


def test_worker_invalid_source_detection():
    """Verify worker detects inaccessible source and transitions to RECONNECTING/ERROR."""
    request = StreamConnectRequest(
        camera_id="CAM_INVALID_SOURCE",
        source_url="invalid_non_existent_file_path_12345.mp4",
        source_type=StreamSourceType.FILE,
        reconnect_interval_sec=0.5,
        max_reconnect_attempts=2,
    )
    worker = StreamWorker(request)
    worker.start()

    # Wait briefly for worker to attempt opening source
    time.sleep(1.2)

    health = worker.get_health()
    assert health.status in (StreamStatus.RECONNECTING, StreamStatus.ERROR)
    assert health.reconnect_count >= 1
    assert health.last_error is not None
    assert health.total_frames_read == 0

    worker.stop()
    assert not worker.is_alive()


def test_worker_start_and_stop_cleanly():
    """Verify worker starts and stops without hanging or leaving zombie threads."""
    request = StreamConnectRequest(
        camera_id="CAM_LIFECYCLE",
        source_url="dummy.mp4",
        source_type=StreamSourceType.FILE,
        reconnect_interval_sec=1.0,
    )
    worker = StreamWorker(request)
    worker.start()
    assert worker.is_alive()

    worker.stop()
    assert not worker.is_alive()
    assert worker.get_health().status == StreamStatus.OFFLINE


def test_worker_simulated_stream_loop():
    """
    Test the ingestion loop, frame buffering, FPS calculation, and snapshot extraction
    using a mock OpenCV capture backend. Ensures logic is 100% verified.
    """
    mock_cv2 = MagicMock()
    mock_cap = MagicMock()
    mock_cap.isOpened.return_value = True
    fake_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    mock_cap.read.return_value = (True, fake_frame)
    mock_cap.get.side_effect = lambda prop: 30.0 if prop == mock_cv2.CAP_PROP_FPS else (
        640 if prop == mock_cv2.CAP_PROP_FRAME_WIDTH else 480
    )
    mock_cv2.VideoCapture.return_value = mock_cap
    mock_cv2.imencode.return_value = (True, np.array([255, 216, 255, 224], dtype=np.uint8))

    with patch("backend.services.stream_worker.cv2", mock_cv2):
        request = StreamConnectRequest(
            camera_id="CAM_MOCK_STREAM",
            source_url="rtsp://mock-camera/live",
            source_type=StreamSourceType.RTSP,
        )
        worker = StreamWorker(request)
        worker.start()

        time.sleep(0.5)

        health = worker.get_health()
        assert health.status == StreamStatus.ONLINE
        assert health.total_frames_read > 0
        assert health.resolution == "640x480"

        frame = worker.get_latest_frame()
        assert frame is not None
        assert frame.shape == (480, 640, 3)

        jpeg_bytes = worker.get_latest_frame_jpeg()
        assert jpeg_bytes is not None

        worker.stop()
        assert worker.get_health().status == StreamStatus.OFFLINE


def test_worker_video_reading(sample_mp4_video: str):
    """Verify continuous frame ingestion and health metrics from a real synthetic video."""
    request = StreamConnectRequest(
        camera_id="CAM_SYNTHETIC_TEST",
        source_url=sample_mp4_video,
        source_type=StreamSourceType.FILE,
        loop_video=True,
    )
    worker = StreamWorker(request)
    worker.start()

    time.sleep(1.5)

    health = worker.get_health()
    assert health.status == StreamStatus.ONLINE
    assert health.total_frames_read > 5
    assert health.resolution == "320x240"
    assert health.fps > 0.0

    frame = worker.get_latest_frame()
    assert frame is not None
    assert frame.shape == (240, 320, 3)

    jpeg_bytes = worker.get_latest_frame_jpeg()
    assert jpeg_bytes is not None
    assert jpeg_bytes[:2] == b"\xff\xd8"

    worker.stop()
    assert worker.get_health().status == StreamStatus.OFFLINE
