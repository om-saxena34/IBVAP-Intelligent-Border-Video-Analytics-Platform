from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.models.alert import (
    Alert,
    AlertListResponse,
    AlertStatus,
    Severity,
)
from backend.services.alert_service import alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get(
    "",
    response_model=AlertListResponse,
    summary="Get all generated alerts",
    description="Returns all alerts generated from HIGH and CRITICAL severity events along with the total alert count.",
)
async def get_all_alerts(
    camera_id: Optional[str] = Query(default=None, description="Filter alerts by camera ID"),
    status_filter: Optional[AlertStatus] = Query(default=None, alias="status", description="Filter by ACTIVE or RESOLVED"),
    severity: Optional[Severity] = Query(default=None, description="Filter by severity level"),
) -> AlertListResponse:
    alerts = alert_service.get_all_alerts(
        camera_id=camera_id,
        status=status_filter,
        severity=severity,
    )

    return AlertListResponse(
        total=len(alerts) if (camera_id or status_filter or severity) else alert_service.get_total_alerts(),
        alerts=alerts,
    )


@router.patch(
    "/{alert_id}/resolve",
    response_model=Alert,
    summary="Resolve an alert",
    description="Marks an active perimeter threat alert as RESOLVED.",
)
async def resolve_alert(alert_id: int) -> Alert:
    alert = alert_service.resolve_alert(alert_id)

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found",
        )

    return alert