from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import config

from api.routes import router
from api.websocket import websocket_endpoint

app = FastAPI(
    title="NakaAnalytics API",
    description="End-to-End Predictive Deployment System for Traffic Police Optimization",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await websocket_endpoint(websocket)


dashboard_dir = config.BASE_DIR / "dashboard"
if dashboard_dir.exists():
    app.mount(
        "/dashboard",
        StaticFiles(directory=str(dashboard_dir), html=True),
        name="dashboard",
    )


@app.get("/")
async def root():
    return {
        "message": "NakaAnalytics API",
        "version": "1.0.0",
        "docs": "/docs",
        "dashboard": "/dashboard",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
