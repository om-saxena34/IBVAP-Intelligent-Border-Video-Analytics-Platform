from typing import List
from fastapi import APIRouter, HTTPException, status

from backend.models.alert import Alert
from backend.services.alert_service import alert_service
from backend.models.alert import (
    Alert,
    AlertListResponse,
)

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get(
    "",
    response_model=AlertListResponse,
    summary="Get all generated alerts",
    description="Returns all alerts generated from HIGH and CRITICAL severity events along with the total alert count.",
)
async def get_all_alerts() -> AlertListResponse:
    alerts = alert_service.get_all_alerts()

    return AlertListResponse(
        total=alert_service.get_total_alerts(),
        alerts=alerts,
    )


@router.patch(
    "/{alert_id}/resolve",
    response_model=Alert,
    summary="Resolve an alert (PATCH)",
)
@router.post(
    "/{alert_id}/resolve",
    response_model=Alert,
    summary="Resolve an alert (POST)",
)
async def resolve_alert(alert_id: int) -> Alert:
    alert = alert_service.resolve_alert(alert_id)

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found",
        )

    return alert