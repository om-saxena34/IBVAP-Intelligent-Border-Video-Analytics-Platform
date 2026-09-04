"""
IBVAP — Intelligent Border Video Analytics Platform
FastAPI Application Entry Point.
"""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.health import router as health_router
from backend.api.streams import router as streams_router
from backend.services.stream_manager import stream_manager
from config.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ibvap.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and clean background shutdown."""
    logger.info("Initializing %s (v%s)", settings.API_TITLE, settings.API_VERSION)
    yield
    logger.info("Application shutting down. Releasing active stream resources...")
    stream_manager.shutdown_all()
    logger.info("All stream resources cleaned up successfully.")


app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=(
        "AI-Based Intelligent Video Analytics Platform for Border Surveillance "
        "using existing CCTV infrastructure. SIH 2026 Problem Statement."
    ),
    lifespan=lifespan,
)

# CORS Middleware for Command Dashboard Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(streams_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
async def root() -> JSONResponse:
    """Root platform info endpoint."""
    return JSONResponse(
        content={
            "platform": settings.API_TITLE,
            "version": settings.API_VERSION,
            "tagline": "Detect. Understand. Correlate. Respond.",
            "status": "operational",
            "docs_url": "/docs",
            "health_url": "/health",
            "streams_url": "/streams",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
