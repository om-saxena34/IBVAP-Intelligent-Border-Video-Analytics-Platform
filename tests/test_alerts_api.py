"""
Unit and integration tests for the Alerts API (/alerts).
"""
from fastapi.testclient import TestClient


def test_get_alerts_initially_empty(client: TestClient):
    """Verify GET /alerts returns zero alerts initially."""
    response = client.get("/alerts")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["alerts"] == []


def test_resolve_alert_lifecycle(client: TestClient):
    """
    Test alert lifecycle:
    1. Create CRITICAL event -> Alert created with ACTIVE status.
    2. Resolve alert -> Status transitions to RESOLVED.
    3. Filter by ACTIVE and RESOLVED statuses.
    """
    # Create CRITICAL event
    event_payload = {
        "camera_id": "CAM-001",
        "event_type": "RESTRICTED_ZONE_ENTRY",
        "severity": "CRITICAL",
        "confidence": 0.95,
    }
    client.post("/events", json=event_payload)

    # Verify active alert
    res = client.get("/alerts")
    assert res.status_code == 200
    assert res.json()["total"] == 1
    alert = res.json()["alerts"][0]
    alert_id = alert["id"]
    assert alert["status"] == "ACTIVE"
    assert alert["severity"] == "CRITICAL"
    assert alert["camera_id"] == "CAM-001"

    # Resolve alert
    resolve_res = client.patch(f"/alerts/{alert_id}/resolve")
    assert resolve_res.status_code == 200
    resolved_alert = resolve_res.json()
    assert resolved_alert["id"] == alert_id
    assert resolved_alert["status"] == "RESOLVED"

    # Verify filtering
    active_res = client.get("/alerts?status=ACTIVE")
    assert active_res.status_code == 200
    assert active_res.json()["total"] == 0

    resolved_res = client.get("/alerts?status=RESOLVED")
    assert resolved_res.status_code == 200
    assert resolved_res.json()["total"] == 1


def test_resolve_invalid_alert_id(client: TestClient):
    """Verify resolving non-existent alert ID returns 404."""
    response = client.patch("/alerts/99999/resolve")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
