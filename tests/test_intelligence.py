"""
Unit and integration tests for Border Intelligence, Virtual Fence, Suspicious Activity, and Sequence Correlation.
"""
from datetime import datetime
from fastapi.testclient import TestClient

from backend.models.zone import Point
from backend.services.intelligence_service import IntelligenceService, intelligence_service


def test_geometric_intersection_and_point_in_polygon():
    """Verify core math for segment intersection and ray casting point-in-polygon."""
    # Segment intersection
    A = Point(x=0.0, y=0.5)
    B = Point(x=1.0, y=0.5)  # Horizontal line y = 0.5
    C = Point(x=0.5, y=0.0)
    D = Point(x=0.5, y=1.0)  # Vertical line x = 0.5 crossing AB
    assert IntelligenceService.check_segments_intersect(A, B, C, D) is True

    # Non-intersecting segments
    E = Point(x=0.0, y=0.2)
    F = Point(x=1.0, y=0.2)
    assert IntelligenceService.check_segments_intersect(A, B, E, F) is False

    # Point in Polygon
    poly = [
        Point(x=0.2, y=0.2),
        Point(x=0.8, y=0.2),
        Point(x=0.8, y=0.8),
        Point(x=0.2, y=0.8),
    ]
    inside_pt = Point(x=0.5, y=0.5)
    outside_pt = Point(x=0.1, y=0.1)
    assert IntelligenceService.check_point_in_polygon(inside_pt, poly) is True
    assert IntelligenceService.check_point_in_polygon(outside_pt, poly) is False


def test_list_and_create_zones_api(client: TestClient):
    """Verify listing and configuring border zones."""
    # List default bootstrap zones
    res = client.get("/intelligence/zones")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 3

    # Create new zone
    new_zone = {
        "camera_id": "CAM-TEST-ZONE",
        "zone_name": "Test Tripwire Alpha",
        "zone_type": "tripwire",
        "coordinates": [{"x": 0.1, "y": 0.5}, {"x": 0.9, "y": 0.5}],
    }
    create_res = client.post("/intelligence/zones", json=new_zone)
    assert create_res.status_code == 201
    zone_data = create_res.json()
    assert zone_data["camera_id"] == "CAM-TEST-ZONE"
    assert zone_data["zone_type"] == "tripwire"
    zone_id = zone_data["zone_id"]

    # Delete zone
    del_res = client.delete(f"/intelligence/zones/{zone_id}")
    assert del_res.status_code == 200


def test_evaluate_virtual_fence_crossing(client: TestClient):
    """Verify movement crossing a tripwire triggers VIRTUAL_FENCE_BREACH and HIGH severity alert."""
    payload = {
        "camera_id": "CAM-001",
        "tracks": [
            {
                "subject_id": "TRK-001",
                "subject_type": "PERSON",
                "path": [{"x": 0.5, "y": 0.60}, {"x": 0.5, "y": 0.80}],  # crosses y=0.70 tripwire
                "current_position": {"x": 0.5, "y": 0.80},
                "dwell_time_seconds": 2.0,
                "speed": 1.2,
            }
        ],
    }
    res = client.post("/intelligence/evaluate", json=payload)
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 1

    breach_events = [e for e in events if e["event_type"] == "VIRTUAL_FENCE_BREACH"]
    assert len(breach_events) == 1
    assert breach_events[0]["severity"] == "HIGH"
    assert breach_events[0]["confidence"] == 0.92

    # Verify alert was generated
    alerts_res = client.get("/alerts")
    assert alerts_res.json()["total"] >= 1
    assert alerts_res.json()["alerts"][0]["event_type"] == "VIRTUAL_FENCE_BREACH"


def test_evaluate_loitering_and_restricted_entry(client: TestClient):
    """Verify entry and prolonged dwell inside restricted zone triggers LOITERING."""
    payload = {
        "camera_id": "CAM-001",
        "tracks": [
            {
                "subject_id": "TRK-002",
                "subject_type": "PERSON",
                "path": [{"x": 0.5, "y": 0.70}],
                "current_position": {"x": 0.5, "y": 0.70},  # Inside CAM-001 restricted polygon
                "dwell_time_seconds": 15.0,  # > 8.0 threshold
                "speed": 0.2,
            }
        ],
    }
    res = client.post("/intelligence/evaluate", json=payload)
    assert res.status_code == 200
    events = res.json()
    types = [e["event_type"] for e in events]
    assert "RESTRICTED_ZONE_ENTRY" in types
    assert "LOITERING" in types


def test_evaluate_night_time_and_group_movement(client: TestClient):
    """Verify night time movement window and group threshold (>= 3 subjects)."""
    payload = {
        "camera_id": "CAM-002",
        "current_time": "2026-09-06T23:30:00",  # 23:30 night window
        "tracks": [
            {"subject_id": "T1", "current_position": {"x": 0.1, "y": 0.1}},
            {"subject_id": "T2", "current_position": {"x": 0.2, "y": 0.2}},
            {"subject_id": "T3", "current_position": {"x": 0.3, "y": 0.3}},
        ],
    }
    res = client.post("/intelligence/evaluate", json=payload)
    assert res.status_code == 200
    events = res.json()
    types = [e["event_type"] for e in events]
    assert "GROUP_MOVEMENT" in types
    assert "NIGHT_TIME_MOVEMENT" in types


def test_suspicious_sequence_correlation(client: TestClient):
    """
    Verify multiple suspicious events occurring in short window correlate into
    a SUSPICIOUS_SEQUENCE incident with CRITICAL severity.
    """
    # 1. Simulate entry
    client.post("/intelligence/simulate", json={"camera_id": "CAM-001", "event_type": "RESTRICTED_ZONE_ENTRY"})
    # 2. Simulate loitering
    client.post("/intelligence/simulate", json={"camera_id": "CAM-001", "event_type": "LOITERING"})

    # Evaluate another track to trigger correlation
    payload = {
        "camera_id": "CAM-001",
        "tracks": [
            {
                "subject_id": "TRK-SEQ",
                "speed": 4.0,  # unusual speed
                "current_position": {"x": 0.99, "y": 0.99},
            }
        ],
    }
    res = client.post("/intelligence/evaluate", json=payload)
    assert res.status_code == 200
    events = res.json()
    types = [e["event_type"] for e in events]
    assert "SUSPICIOUS_SEQUENCE" in types

    # Verify CRITICAL alert exists
    alerts = client.get("/alerts?severity=CRITICAL").json()
    assert alerts["total"] >= 1
    assert alerts["alerts"][0]["event_type"] == "SUSPICIOUS_SEQUENCE"
    assert alerts["alerts"][0]["severity"] == "CRITICAL"


def test_simulate_detection_endpoint(client: TestClient):
    """Verify POST /intelligence/simulate works for all Phase 2 event types."""
    event_types = [
        "VIRTUAL_FENCE_BREACH",
        "RESTRICTED_ZONE_ENTRY",
        "LOITERING",
        "UNUSUAL_MOVEMENT",
        "NIGHT_TIME_MOVEMENT",
        "GROUP_MOVEMENT",
        "SUSPICIOUS_SEQUENCE",
    ]
    for et in event_types:
        res = client.post("/intelligence/simulate", json={"camera_id": "CAM-SIM", "event_type": et})
        assert res.status_code == 200
        data = res.json()
        assert data["event_type"] == et
        assert data["camera_id"] == "CAM-SIM"
        assert "confidence" in data
        assert "severity" in data
