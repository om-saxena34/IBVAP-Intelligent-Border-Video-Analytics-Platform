from __future__ import annotations

import logging
from typing import Any

import cv2
from fastapi import APIRouter, File, HTTPException, UploadFile
import numpy as np

from backend.models.alert import Severity
from backend.services.alert_service import alert_service
from backend.services.event_service import event_service
from backend.services.stream_manager import stream_manager

logger = logging.getLogger("ibvap.api.analytics")

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
)

_engine: Any = None


def get_engine() -> Any:
    global _engine

    if _engine is None:
        try:
            from backend.services.analytics_engine import AnalyticsEngine
            _engine = AnalyticsEngine()
        except Exception as exc:
            logger.exception("Failed to initialize analytics engine: %s", exc)
            raise HTTPException(
                status_code=503,
                detail=f"Analytics engine unavailable: {exc}",
            )

    return _engine


@router.get("/summary")
async def get_analytics_summary() -> dict:
    """Return consolidated analytics metrics, real detection aggregates, and event logs."""
    all_events = event_service.get_all_events()
    events_today_count = event_service.get_events_today_count()
    active_alerts = alert_service.get_active_alerts()

    crit_count = sum(1 for e in all_events if e.severity == Severity.CRITICAL)
    high_count = sum(1 for e in all_events if e.severity == Severity.HIGH)
    med_count = sum(1 for e in all_events if e.severity == Severity.MEDIUM)
    low_count = sum(1 for e in all_events if e.severity == Severity.LOW)

    all_stream_infos = stream_manager.list_streams()
    online_count = sum(1 for s in all_stream_infos if s.status.value == "ONLINE")

    total_persons = 0
    total_vehicles = 0
    total_detections = 0

    for s in all_stream_infos:
        dets = stream_manager.get_latest_detections(s.camera_id)
        if dets:
            total_persons += dets.get("cumulative_persons", dets["counts"]["persons"])
            total_vehicles += dets.get("cumulative_vehicles", dets["counts"]["vehicles"])
            total_detections += dets["counts"]["total"]

    # Fallback to events log if no active camera is currently streaming
    if total_persons == 0:
        total_persons = sum(
            1 for e in all_events
            if any(k in e.event_type.lower() for k in ("person", "face", "loitering", "group"))
        )
    if total_vehicles == 0:
        total_vehicles = sum(
            1 for e in all_events
            if any(k in e.event_type.lower() for k in ("vehicle", "car", "plate", "speed", "direction"))
        )

    return {
        "summary": {
            "total_events": len(all_events),
            "events_today": events_today_count,
            "active_alerts": len(active_alerts),
            "critical_events": crit_count,
            "high_events": high_count,
            "medium_events": med_count,
            "low_events": low_count,
            "total_detections": total_detections,
            "cameras_analyzed": len(all_stream_infos),
            "cameras_online": online_count,
            "persons_detected": total_persons,
            "vehicles_detected": total_vehicles,
        },
        "events": [
            {
                "id": e.id,
                "camera_id": e.camera_id,
                "event_type": e.event_type,
                "severity": e.severity.value,
                "timestamp": e.timestamp.isoformat(),
            }
            for e in all_events[:30]
        ],
    }


@router.post("/frame")
async def analyze_frame(
    file: UploadFile = File(...),
) -> dict:
    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="Missing content type",
        )

    data = await file.read()

    frame = cv2.imdecode(
        np.frombuffer(data, dtype=np.uint8),
        cv2.IMREAD_COLOR,
    )

    if frame is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image",
        )

    return get_engine().process_frame(frame)