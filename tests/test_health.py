"""
Unit and integration tests for the /health and root endpoints.
"""
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test that GET / returns the platform info and correct tagline."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "platform" in data
    assert data["tagline"] == "Detect. Understand. Correlate. Respond."
    assert data["status"] == "operational"


def test_health_endpoint(client: TestClient):
    """Test that GET /health returns healthy status and camera counts."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "uptime_seconds" in data
    assert data["uptime_seconds"] >= 0
    assert "total_cameras" in data
    assert "online_cameras" in data
    assert data["total_cameras"] == 0
