from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

import cv2
import numpy as np

from backend.services.analytics_engine import AnalyticsEngine


router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
)

_engine: AnalyticsEngine | None = None


def get_engine() -> AnalyticsEngine:
    global _engine

    if _engine is None:
        _engine = AnalyticsEngine()

    return _engine


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