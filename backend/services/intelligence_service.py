"""
Border Intelligence and Virtual Fence Service for IBVAP.
Implements:
1. Virtual Fence / Tripwire line-intersection detection.
2. Restricted Zone Point-in-Polygon detection.
3. Loitering detection based on zone dwell thresholds.
4. Unusual movement detection based on trajectory and velocity metrics.
5. Night-time movement detection based on configurable high-risk time windows.
6. Group movement detection based on concurrent tracked subject density.
7. Suspicious Sequence multi-event correlation engine (generates CRITICAL incident).
8. Simulation triggers for UI testing and operator demonstrations.
"""
import logging
import math
from datetime import datetime, time as dtime
from typing import Any, Dict, List, Optional, Tuple

from backend.models.alert import Severity
from backend.models.event import CreateEventRequest, Event
from backend.models.zone import (
    CreateZoneRequest,
    EvaluateMovementRequest,
    MovementTrack,
    Point,
    SimulateDetectionRequest,
    ZoneConfig,
    ZoneType,
)
from backend.services.event_service import event_service

logger = logging.getLogger("ibvap.intelligence")


class IntelligenceService:
    """Service managing camera perimeter zones and executing rule-based border threat analytics."""

    def __init__(self):
        self._zones: Dict[str, ZoneConfig] = {}
        self._bootstrap_default_zones()

    # -------------------------------------------------------------------------
    # Zone Management (CRUD)
    # -------------------------------------------------------------------------
    def _bootstrap_default_zones(self) -> None:
        """Pre-populate default virtual fences and restricted zones for standard cameras."""
        defaults = [
            ZoneConfig(
                zone_id="ZONE-CAM-001-FENCE",
                camera_id="CAM-001",
                zone_name="North Perimeter Tripwire",
                zone_type=ZoneType.TRIPWIRE,
                coordinates=[Point(x=0.15, y=0.70), Point(x=0.85, y=0.70)],
                loitering_threshold_sec=10.0,
                color="#ef4444",
            ),
            ZoneConfig(
                zone_id="ZONE-CAM-001-RESTRICTED",
                camera_id="CAM-001",
                zone_name="Sector 4 Exclusion Zone",
                zone_type=ZoneType.RESTRICTED,
                coordinates=[
                    Point(x=0.20, y=0.55),
                    Point(x=0.80, y=0.55),
                    Point(x=0.85, y=0.90),
                    Point(x=0.15, y=0.90),
                ],
                loitering_threshold_sec=8.0,
                color="#f59e0b",
            ),
            ZoneConfig(
                zone_id="ZONE-CAM-002-TRIPWIRE",
                camera_id="CAM-002",
                zone_name="BOP Bravo Border Line",
                zone_type=ZoneType.TRIPWIRE,
                coordinates=[Point(x=0.10, y=0.60), Point(x=0.90, y=0.60)],
                loitering_threshold_sec=10.0,
                color="#ef4444",
            ),
            ZoneConfig(
                zone_id="ZONE-CAM-01-FENCE",
                camera_id="CAM_01",
                zone_name="Post Alpha Virtual Tripwire",
                zone_type=ZoneType.TRIPWIRE,
                coordinates=[Point(x=0.10, y=0.65), Point(x=0.90, y=0.65)],
                loitering_threshold_sec=10.0,
                color="#ef4444",
            ),
        ]
        for z in defaults:
            self._zones[z.zone_id] = z

    def get_all_zones(self, camera_id: Optional[str] = None) -> List[ZoneConfig]:
        """List all configured zones, optionally filtered by camera."""
        if camera_id:
            return [z for z in self._zones.values() if z.camera_id == camera_id]
        return list(self._zones.values())

    def get_zone(self, zone_id: str) -> Optional[ZoneConfig]:
        """Get a single zone by ID."""
        return self._zones.get(zone_id)

    def create_zone(self, request: CreateZoneRequest) -> ZoneConfig:
        """Create or replace a camera zone."""
        zone_id = request.zone_id or f"ZONE-{request.camera_id}-{len(self._zones) + 1:03d}"
        zone = ZoneConfig(
            zone_id=zone_id,
            camera_id=request.camera_id,
            zone_name=request.zone_name,
            zone_type=request.zone_type,
            coordinates=request.coordinates,
            loitering_threshold_sec=request.loitering_threshold_sec or 10.0,
            is_active=request.is_active,
            color=request.color or "#ef4444",
            created_at=datetime.now(),
        )
        self._zones[zone_id] = zone
        return zone

    def delete_zone(self, zone_id: str) -> bool:
        """Remove a zone configuration."""
        if zone_id in self._zones:
            del self._zones[zone_id]
            return True
        return False

    # -------------------------------------------------------------------------
    # Geometric Algorithms
    # -------------------------------------------------------------------------
    @staticmethod
    def _ccw(A: Point, B: Point, C: Point) -> bool:
        """Check if three points are in counter-clockwise orientation."""
        return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x)

    @classmethod
    def check_segments_intersect(cls, A: Point, B: Point, C: Point, D: Point) -> bool:
        """Return True if line segment AB intersects line segment CD."""
        return (cls._ccw(A, C, D) != cls._ccw(B, C, D)) and (cls._ccw(A, B, C) != cls._ccw(A, B, D))

    @staticmethod
    def check_point_in_polygon(point: Point, polygon: List[Point]) -> bool:
        """
        Ray-casting algorithm to determine if a 2D point is inside a polygon.
        """
        n = len(polygon)
        if n < 3:
            return False
        inside = False
        p1x, p1y = polygon[0].x, polygon[0].y
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n].x, polygon[i % n].y
            if point.y > min(p1y, p2y):
                if point.y <= max(p1y, p2y):
                    if point.x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (point.y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or point.x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    # -------------------------------------------------------------------------
    # Rule Evaluation Engines
    # -------------------------------------------------------------------------
    def evaluate_movement(self, request: EvaluateMovementRequest) -> List[Event]:
        """
        Evaluate movement tracks against camera zones and trigger events for:
        - Virtual fence crossing (tripwires)
        - Restricted zone entry
        - Loitering
        - Unusual movement
        - Night-time movement
        - Group movement
        - Correlate suspicious sequences into CRITICAL incident
        """
        generated_events: List[Event] = []
        camera_id = request.camera_id
        eval_time = request.current_time or datetime.now()
        zones = self.get_all_zones(camera_id=camera_id)

        # 1. Group Movement Rule: Multiple tracked subjects (>= 3)
        if len(request.tracks) >= 3:
            event = event_service.create_event(
                CreateEventRequest(
                    camera_id=camera_id,
                    event_type="GROUP_MOVEMENT",
                    severity=Severity.HIGH,
                    confidence=0.91,
                    timestamp=eval_time,
                    details={
                        "tracked_subject_count": len(request.tracks),
                        "subject_ids": [t.subject_id for t in request.tracks],
                        "rule": "Group intrusion density >= 3 subjects detected",
                    },
                )
            )
            generated_events.append(event)

        # 2. Night-time Movement Rule (e.g., 22:00 to 05:00)
        hour = eval_time.hour
        is_night = hour >= 22 or hour < 5
        if is_night and len(request.tracks) > 0:
            event = event_service.create_event(
                CreateEventRequest(
                    camera_id=camera_id,
                    event_type="NIGHT_TIME_MOVEMENT",
                    severity=Severity.HIGH,
                    confidence=0.95,
                    timestamp=eval_time,
                    details={
                        "hour": hour,
                        "time_window": "22:00-05:00",
                        "subject_count": len(request.tracks),
                        "rule": "Perimeter activity detected during restricted night hours",
                    },
                )
            )
            generated_events.append(event)

        # Track-specific checks
        for track in request.tracks:
            # Unusual Movement (high speed or erratic reversals)
            if track.speed > 3.0:
                event = event_service.create_event(
                    CreateEventRequest(
                        camera_id=camera_id,
                        event_type="UNUSUAL_MOVEMENT",
                        severity=Severity.HIGH if track.speed > 4.5 else Severity.MEDIUM,
                        confidence=0.87,
                        timestamp=eval_time,
                        details={
                            "subject_id": track.subject_id,
                            "speed": track.speed,
                            "rule": "Abnormal velocity / erratic movement condition detected",
                        },
                    )
                )
                generated_events.append(event)

            # Zone-based checks
            for zone in zones:
                if not zone.is_active:
                    continue

                # Tripwire / Virtual Fence Crossing
                if zone.zone_type == ZoneType.TRIPWIRE and len(zone.coordinates) >= 2:
                    fence_p1 = zone.coordinates[0]
                    fence_p2 = zone.coordinates[1]

                    # Check if subject path crossed the tripwire segment
                    if len(track.path) >= 2:
                        path_p1 = track.path[-2]
                        path_p2 = track.path[-1]
                        if self.check_segments_intersect(fence_p1, fence_p2, path_p1, path_p2):
                            event = event_service.create_event(
                                CreateEventRequest(
                                    camera_id=camera_id,
                                    event_type="VIRTUAL_FENCE_BREACH",
                                    severity=Severity.HIGH,
                                    confidence=0.92,
                                    timestamp=eval_time,
                                    details={
                                        "zone_id": zone.zone_id,
                                        "zone_name": zone.zone_name,
                                        "subject_id": track.subject_id,
                                        "subject_type": track.subject_type,
                                        "rule": "Subject crossed configured virtual fence tripwire",
                                    },
                                )
                            )
                            generated_events.append(event)

                # Restricted Zone & Loitering
                elif zone.zone_type in (ZoneType.RESTRICTED, ZoneType.LOITERING, ZoneType.PERIMETER):
                    is_inside = self.check_point_in_polygon(track.current_position, zone.coordinates)
                    if is_inside:
                        # Restricted Zone Entry
                        event = event_service.create_event(
                            CreateEventRequest(
                                camera_id=camera_id,
                                event_type="RESTRICTED_ZONE_ENTRY",
                                severity=Severity.HIGH,
                                confidence=0.94,
                                timestamp=eval_time,
                                details={
                                    "zone_id": zone.zone_id,
                                    "zone_name": zone.zone_name,
                                    "subject_id": track.subject_id,
                                    "subject_type": track.subject_type,
                                    "position": {"x": track.current_position.x, "y": track.current_position.y},
                                    "rule": "Subject presence detected inside restricted sector",
                                },
                            )
                        )
                        generated_events.append(event)

                        # Loitering Rule (dwell time > threshold)
                        if track.dwell_time_seconds >= zone.loitering_threshold_sec:
                            event = event_service.create_event(
                                CreateEventRequest(
                                    camera_id=camera_id,
                                    event_type="LOITERING",
                                    severity=Severity.HIGH if track.dwell_time_seconds >= (zone.loitering_threshold_sec * 2) else Severity.MEDIUM,
                                    confidence=0.89,
                                    timestamp=eval_time,
                                    details={
                                        "zone_id": zone.zone_id,
                                        "zone_name": zone.zone_name,
                                        "subject_id": track.subject_id,
                                        "dwell_time_sec": track.dwell_time_seconds,
                                        "threshold_sec": zone.loitering_threshold_sec,
                                        "rule": f"Subject lingered inside zone for {track.dwell_time_seconds:.1f}s (> {zone.loitering_threshold_sec}s)",
                                    },
                                )
                            )
                            generated_events.append(event)

        # 3. Suspicious Sequence Correlation
        # If multiple suspicious events occurred within the last 60 seconds on this camera, correlate them
        if generated_events:
            sequence_event = self._check_and_correlate_sequence(camera_id, eval_time)
            if sequence_event:
                generated_events.append(sequence_event)

        return generated_events

    def _check_and_correlate_sequence(
        self,
        camera_id: str,
        current_time: datetime,
        window_seconds: float = 60.0,
    ) -> Optional[Event]:
        """
        Correlate multiple suspicious events occurring on a camera within the time window.
        Generates a SUSPICIOUS_SEQUENCE CRITICAL incident if >= 2 events are found.
        """
        recent = event_service.get_recent_events_for_camera(camera_id, window_seconds=window_seconds)
        # Exclude already correlated SUSPICIOUS_SEQUENCE events
        suspicious = [e for e in recent if e.event_type != "SUSPICIOUS_SEQUENCE"]

        if len(suspicious) >= 2:
            event = event_service.create_event(
                CreateEventRequest(
                    camera_id=camera_id,
                    event_type="SUSPICIOUS_SEQUENCE",
                    severity=Severity.CRITICAL,
                    confidence=0.98,
                    timestamp=current_time,
                    details={
                        "correlated_event_count": len(suspicious),
                        "sequence": [
                            {"id": e.id, "type": e.event_type, "severity": e.severity, "time": str(e.timestamp)}
                            for e in suspicious[-4:]
                        ],
                        "rule": f"Correlated {len(suspicious)} suspicious activities within {window_seconds}s window",
                    },
                )
            )
            return event
        return None

    # -------------------------------------------------------------------------
    # Simulation API
    # -------------------------------------------------------------------------
    def simulate_detection(self, request: SimulateDetectionRequest) -> Event:
        """
        Convenience execution endpoint to simulate a detection rule on-demand.
        Supports all Phase 2 event types:
        - VIRTUAL_FENCE_BREACH
        - RESTRICTED_ZONE_ENTRY
        - LOITERING
        - UNUSUAL_MOVEMENT
        - NIGHT_TIME_MOVEMENT
        - GROUP_MOVEMENT
        - SUSPICIOUS_SEQUENCE
        """
        now = datetime.now()
        event_type = request.event_type.upper().strip()

        # Default rules dictionary
        defaults: Dict[str, Tuple[Severity, float, Dict[str, Any]]] = {
            "VIRTUAL_FENCE_BREACH": (
                Severity.HIGH,
                0.92,
                {
                    "zone_name": "Perimeter Virtual Fence",
                    "subject_type": request.subject_type,
                    "crossing_direction": "INBOUND_NORTH",
                    "rule": "Tripwire crossed by target subject",
                },
            ),
            "RESTRICTED_ZONE_ENTRY": (
                Severity.HIGH,
                0.94,
                {
                    "zone_name": "Sector Exclusion Zone",
                    "subject_type": request.subject_type,
                    "rule": "Unauthorized entry into restricted border zone",
                },
            ),
            "LOITERING": (
                Severity.MEDIUM,
                0.88,
                {
                    "zone_name": "Sensitive Checkpost Buffer",
                    "subject_type": request.subject_type,
                    "dwell_time_sec": 24.5,
                    "threshold_sec": 10.0,
                    "rule": "Subject loitered in zone beyond 10s threshold",
                },
            ),
            "UNUSUAL_MOVEMENT": (
                Severity.MEDIUM,
                0.86,
                {
                    "speed_multiplier": 3.2,
                    "trajectory_variance": "high_erratic_zigzag",
                    "rule": "Abnormal movement trajectory detected",
                },
            ),
            "NIGHT_TIME_MOVEMENT": (
                Severity.HIGH,
                0.95,
                {
                    "time_window": "22:00-05:00",
                    "subject_count": 1,
                    "rule": "Perimeter movement during restricted night window",
                },
            ),
            "GROUP_MOVEMENT": (
                Severity.HIGH,
                0.91,
                {
                    "subject_count": 4,
                    "cluster_diameter_m": 6.5,
                    "rule": "Coordinated multi-subject cluster moving through sector",
                },
            ),
            "SUSPICIOUS_SEQUENCE": (
                Severity.CRITICAL,
                0.98,
                {
                    "correlated_activities": ["RESTRICTED_ZONE_ENTRY", "LOITERING", "UNUSUAL_MOVEMENT"],
                    "threat_level": "RED_TACTICAL_PRIORITY",
                    "rule": "Multiple suspicious activities correlated within 60s",
                },
            ),
            "PERSON_DETECTED": (
                Severity.LOW,
                0.90,
                {"subject_type": "PERSON", "rule": "Standard perimeter subject detection"},
            ),
            "VEHICLE_DETECTED": (
                Severity.LOW,
                0.89,
                {"subject_type": "VEHICLE", "rule": "Vehicle detection in peripheral road"},
            ),
            "FACE_DETECTED": (
                Severity.LOW,
                0.87,
                {"subject_type": "FACE", "rule": "Facial feature recognized"},
            ),
            "ANPR_DETECTED": (
                Severity.LOW,
                0.93,
                {"plate_number": "DEF-8821", "rule": "License plate optical recognition"},
            ),
        }

        default_sev, default_conf, default_det = defaults.get(
            event_type,
            (Severity.HIGH, 0.90, {"rule": f"Rule execution for {event_type}"}),
        )

        final_severity = request.severity or default_sev
        final_confidence = request.confidence if request.confidence is not None else default_conf

        combined_details = dict(default_det)
        if request.custom_details:
            combined_details.update(request.custom_details)

        event = event_service.create_event(
            CreateEventRequest(
                camera_id=request.camera_id,
                event_type=event_type,
                severity=final_severity,
                confidence=final_confidence,
                timestamp=now,
                details=combined_details,
            )
        )

        return event


intelligence_service = IntelligenceService()
