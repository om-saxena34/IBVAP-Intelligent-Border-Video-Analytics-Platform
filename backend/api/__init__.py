"""
API router package for IBVAP.
"""
from backend.api.alerts import router as alerts_router
from backend.api.events import router as events_router
from backend.api.health import router as health_router
from backend.api.intelligence import router as intelligence_router
from backend.api.streams import router as streams_router

__all__ = [
    "alerts_router",
    "events_router",
    "health_router",
    "intelligence_router",
    "streams_router",
]

