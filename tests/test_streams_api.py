"""
Integration tests for Stream Management and Ingestion REST endpoints.
"""
import time
from fastapi.testclient import TestClient


def test_stream_lifecycle_api(client: TestClient, sample_mp4_video: str):
    """End-to-end test of registering, querying health, taking snapshot, and disconnecting."""
    camera_id = "CAM_API_E2E"

    # 1. Connect stream
    connect_payload = {
        "camera_id": camera_id,
        "source_url": sample_mp4_video,
        "source_type": "FILE",
        "location": "BOP North Gate Alpha",
        "sector": "Sector 1",
        "loop_video": True,
    }
    response = client.post("/streams/connect", json=connect_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["camera_id"] == camera_id
    assert data["location"] == "BOP North Gate Alpha"
    assert data["sector"] == "Sector 1"

    # Wait briefly for frames to be ingested
    time.sleep(1.0)

    # 2. List streams
    list_response = client.get("/streams")
    assert list_response.status_code == 200
    streams_list = list_response.json()
    assert any(s["camera_id"] == camera_id for s in streams_list)

    # 3. Get single stream detail
    detail_response = client.get(f"/streams/{camera_id}")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["camera_id"] == camera_id
    assert detail["status"] == "ONLINE"

    # 4. Query stream health
    health_response = client.get(f"/streams/{camera_id}/health")
    assert health_response.status_code == 200
    health = health_response.json()
    assert health["camera_id"] == camera_id
    assert health["status"] == "ONLINE"
    assert health["total_frames_read"] > 0
    assert health["fps"] > 0.0

    # 5. Check global health reflection
    global_health = client.get("/health").json()
    assert global_health["total_cameras"] >= 1
    assert global_health["online_cameras"] >= 1

    # 6. Fetch snapshot
    snapshot_response = client.get(f"/streams/{camera_id}/snapshot")
    assert snapshot_response.status_code == 200
    assert snapshot_response.headers["content-type"] == "image/jpeg"
    assert len(snapshot_response.content) > 0

    # 7. Disconnect stream
    disconnect_response = client.post(f"/streams/{camera_id}/disconnect")
    assert disconnect_response.status_code == 200
    disc_data = disconnect_response.json()
    assert disc_data["camera_id"] == camera_id
    assert disc_data["status"] == "OFFLINE"

    # 8. Verify stream is removed
    get_after_disc = client.get(f"/streams/{camera_id}")
    assert get_after_disc.status_code == 404


def test_stream_not_found_endpoints(client: TestClient):
    """Verify 404 responses for non-existent camera IDs."""
    fake_id = "NON_EXISTENT_CAMERA_999"
    assert client.get(f"/streams/{fake_id}").status_code == 404
    assert client.get(f"/streams/{fake_id}/health").status_code == 404
    assert client.get(f"/streams/{fake_id}/snapshot").status_code == 404
    assert client.post(f"/streams/{fake_id}/disconnect").status_code == 404


def test_stream_connect_invalid_payload(client: TestClient):
    """Verify validation error when required fields are missing."""
    # Missing source_url
    bad_payload = {"camera_id": "BAD_CAM"}
    response = client.post("/streams/connect", json=bad_payload)
    assert response.status_code == 422


def test_stream_connect_nonexistent_file_handling(client: TestClient):
    """Verify system handles connection to nonexistent video source without crashing."""
    camera_id = "CAM_OFFLINE_TEST"
    payload = {
        "camera_id": camera_id,
        "source_url": "non_existent_border_file.mp4",
        "source_type": "FILE",
        "reconnect_interval_sec": 0.5,
        "max_reconnect_attempts": 2,
    }
    response = client.post("/streams/connect", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["camera_id"] == camera_id

    # Wait for initial connection attempt
    time.sleep(1.2)

    health_resp = client.get(f"/streams/{camera_id}/health")
    assert health_resp.status_code == 200
    health = health_resp.json()
    assert health["status"] in ("RECONNECTING", "ERROR", "OFFLINE")

    # Snapshot should return 503 when no frame captured
    snap_resp = client.get(f"/streams/{camera_id}/snapshot")
    assert snap_resp.status_code == 503

    # Clean up
    client.post(f"/streams/{camera_id}/disconnect")
