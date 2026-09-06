"""
Unit and integration tests for the Events API (/events).
"""
from fastapi.testclient import TestClient


def test_get_events_initially_empty(client: TestClient):
    """Verify GET /events returns zero events initially."""
    response = client.get("/events")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["events"] == []


def test_create_event_and_high_severity_alert_generation(client: TestClient):
    """
    Verify creating a HIGH severity VIRTUAL_FENCE_BREACH event automatically
    generates an active alert in the alert system.
    """
    payload = {
        "camera_id": "CAM-001",
        "event_type": "VIRTUAL_FENCE_BREACH",
        "severity": "HIGH",
        "confidence": 0.92,
    }
    response = client.post("/events", json=payload)
    assert response.status_code == 200
    event_data = response.json()
    assert event_data["id"] == 1
    assert event_data["camera_id"] == "CAM-001"
    assert event_data["event_type"] == "VIRTUAL_FENCE_BREACH"
    assert event_data["severity"] == "HIGH"
    assert event_data["confidence"] == 0.92
    assert "timestamp" in event_data

    # Verify event appears in GET /events
    events_res = client.get("/events")
    assert events_res.status_code == 200
    assert events_res.json()["total"] == 1

    # Verify alert was automatically created
    alerts_res = client.get("/alerts")
    assert alerts_res.status_code == 200
    alerts_data = alerts_res.json()
    assert alerts_data["total"] == 1
    alert = alerts_data["alerts"][0]
    assert alert["camera_id"] == "CAM-001"
    assert alert["event_type"] == "VIRTUAL_FENCE_BREACH"
    assert alert["severity"] == "HIGH"
    assert alert["status"] == "ACTIVE"


def test_low_and_medium_events_do_not_generate_alerts(client: TestClient):
    """Verify LOW and MEDIUM events stay in event log without generating alerts."""
    low_event = {
        "camera_id": "CAM-002",
        "event_type": "PERSON_DETECTED",
        "severity": "LOW",
        "confidence": 0.88,
    }
    med_event = {
        "camera_id": "CAM-002",
        "event_type": "LOITERING",
        "severity": "MEDIUM",
        "confidence": 0.85,
    }

    res1 = client.post("/events", json=low_event)
    assert res1.status_code == 200

    res2 = client.post("/events", json=med_event)
    assert res2.status_code == 200

    events_res = client.get("/events")
    assert events_res.json()["total"] == 2

    # Alerts list should remain 0
    alerts_res = client.get("/alerts")
    assert alerts_res.json()["total"] == 0


def test_events_filtering_by_camera(client: TestClient):
    """Verify querying events filtered by camera_id."""
    client.post("/events", json={"camera_id": "CAM-001", "event_type": "PERSON_DETECTED", "severity": "LOW"})
    client.post("/events", json={"camera_id": "CAM-002", "event_type": "VEHICLE_DETECTED", "severity": "LOW"})

    res_cam1 = client.get("/events?camera_id=CAM-001")
    assert res_cam1.status_code == 200
    assert res_cam1.json()["total"] == 1
    assert res_cam1.json()["events"][0]["camera_id"] == "CAM-001"

    res_cam2 = client.get("/events?camera_id=CAM-002")
    assert res_cam2.status_code == 200
    assert res_cam2.json()["total"] == 1
    assert res_cam2.json()["events"][0]["camera_id"] == "CAM-002"
